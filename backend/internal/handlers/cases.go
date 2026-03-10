package handlers

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/iamdetective/backend/internal/models"
	"github.com/iamdetective/backend/internal/repository"
	"github.com/iamdetective/backend/internal/services"
)

type CaseHandler struct {
	Repo                 repository.CaseRepository
	RedisService         services.RedisService
	CourtListenerService services.CourtListenerService
}

func NewCaseHandler(repo repository.CaseRepository, redis services.RedisService, cl services.CourtListenerService) *CaseHandler {
	return &CaseHandler{
		Repo:                 repo,
		RedisService:         redis,
		CourtListenerService: cl,
	}
}

// GET /api/v1/cases/search?q=&jurisdiction=&status=&source=&page=&limit=
func (h *CaseHandler) SearchCases(c *gin.Context) {
	ctx := c.Request.Context()

	// 1. Extract Query Parameters
	q := c.Query("q")
	jurisdiction := c.Query("jurisdiction")
	status := c.Query("status")
	source := c.Query("source")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit > 100 {
		limit = 100
	}
	offset := (page - 1) * limit

	// 2. Check Redis Cache First
	cacheKey := services.BuildSearchCacheKey(q, jurisdiction, status, source, page, limit)
	cachedCases, err := h.RedisService.GetCases(ctx, cacheKey)
	if err == nil && cachedCases != nil {
		c.JSON(http.StatusOK, gin.H{
			"data": cachedCases,
			"meta": gin.H{"source": "cache", "page": page, "limit": limit},
		})
		return
	}

	var results []*models.CaseSchema

	// 3. Fallback to API/DB logic
	if source == "courtlistener" || (source == "" && q != "") { // Force CL search if no source is given but query exists
		// Call CourtListener External API
		results, err = h.CourtListenerService.SearchCases(ctx, q, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch from CourtListener: " + err.Error()})
			return
		}

		// Save new results to Postgres asynchronously
		go func(cases []*models.CaseSchema) {
			bgCtx := context.Background() // decouple context
			for _, caseRecord := range cases {
				// Fire-and-forget saving
				_ = h.Repo.CreateCase(bgCtx, caseRecord)
			}
		}(results)

	} else {
		// Just query postgres
		filters := repository.CaseFilters{
			Jurisdiction: jurisdiction,
			Status:       status,
			Source:       source,
		}

		results, err = h.Repo.SearchCases(ctx, q, filters)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
			return
		}

		// Simple pagination slice logic over search
		// (since our repo cap was 100, we slice safely here)
		end := offset + limit
		if offset >= len(results) {
			results = []*models.CaseSchema{}
		} else if end > len(results) {
			results = results[offset:]
		} else {
			results = results[offset:end]
		}
	}

	// 4. Update Cache
	if len(results) > 0 {
		_ = h.RedisService.SetCases(ctx, cacheKey, results, 15*time.Minute)
	}

	// 5. Return JSON with pagination metadata
	c.JSON(http.StatusOK, gin.H{
		"data": results,
		"meta": gin.H{"source": "database/api", "page": page, "limit": limit, "count": len(results)},
	})
}

// GET /api/v1/cases/:id
func (h *CaseHandler) GetCase(c *gin.Context) {
	ctx := c.Request.Context()
	id := c.Param("id")

	// 1. Check Redis
	cacheKey := "case:" + id
	cached, err := h.RedisService.GetCase(ctx, cacheKey)
	if err == nil && cached != nil {
		c.JSON(http.StatusOK, gin.H{"data": cached, "meta": gin.H{"source": "cache"}})
		return
	}

	// 2. Query Postgres
	caseRecord, err := h.Repo.GetCaseByID(ctx, id)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Case not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}

	// 3. Set Cache
	_ = h.RedisService.SetCase(ctx, cacheKey, caseRecord, 1*time.Hour)

	c.JSON(http.StatusOK, gin.H{"data": caseRecord, "meta": gin.H{"source": "database"}})
}

// GET /api/v1/cases/:id/related?q=
func (h *CaseHandler) GetRelatedCases(c *gin.Context) {
	ctx := c.Request.Context()
	id := c.Param("id")
	q := c.Query("q") // Party name fallback/override

	limit := 5 // Enforcing top 5

	// Check Redis
	cacheKey := "related:" + id + ":q=" + q
	cachedCases, err := h.RedisService.GetCases(ctx, cacheKey)
	if err == nil && cachedCases != nil {
		c.JSON(http.StatusOK, gin.H{"data": cachedCases, "meta": gin.H{"source": "cache"}})
		return
	}

	var partyName = q
	if partyName == "" {
		// Fetch original case to extract party names from local DB
		caseRecord, err := h.Repo.GetCaseByID(ctx, id)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Original case not found to extract party names"})
			return
		}

		if len(caseRecord.Parties) > 0 {
			partyName = caseRecord.Parties[0]
		} else {
			partyName = caseRecord.Title // fallback search based on title
		}
	}

	// Fetch related cases from CourtListener
	related, err := h.CourtListenerService.GetRelatedCases(ctx, partyName, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch related cases: " + err.Error()})
		return
	}

	// Set Redis Cache
	if len(related) > 0 {
		_ = h.RedisService.SetCases(ctx, cacheKey, related, 1*time.Hour)
	}

	c.JSON(http.StatusOK, gin.H{"data": related, "meta": gin.H{"source": "courtlistener_api"}})
}

package handlers

import (
	"context"
	"errors"
	"fmt"
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
	IndianKanoonService  services.IndianKanoonService
	ECourtsService       services.ECourtsService
}

func NewCaseHandler(repo repository.CaseRepository, redis services.RedisService, cl services.CourtListenerService, ik services.IndianKanoonService, ec services.ECourtsService) *CaseHandler {
	return &CaseHandler{
		Repo:                 repo,
		RedisService:         redis,
		CourtListenerService: cl,
		IndianKanoonService:  ik,
		ECourtsService:       ec,
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

// ============================================================
// Indian Kanoon Handlers
// ============================================================

// GET /api/v1/indian-cases/search?q=&pagenum=&court=
func (h *CaseHandler) SearchIndianCases(c *gin.Context) {
	ctx := c.Request.Context()

	q := c.Query("q")
	if q == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
		return
	}

	pageNum, _ := strconv.Atoi(c.DefaultQuery("pagenum", "0"))
	court := c.Query("court") // e.g. "supremecourt", "delhi"

	// Build the IK formInput query with court filter
	formInput := q
	if court != "" {
		formInput = fmt.Sprintf("%s doctypes:%s", q, court)
	}

	// Check Redis cache
	cacheKey := fmt.Sprintf("ik:search:q=%s:p=%d", formInput, pageNum)
	cachedCases, err := h.RedisService.GetCases(ctx, cacheKey)
	if err == nil && cachedCases != nil {
		c.JSON(http.StatusOK, gin.H{
			"data": cachedCases,
			"meta": gin.H{"source": "cache", "pagenum": pageNum},
		})
		return
	}

	// Call IK API
	searchResult, cases, err := h.IndianKanoonService.SearchCases(ctx, formInput, pageNum)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search Indian Kanoon: " + err.Error()})
		return
	}

	// Cache results
	if len(cases) > 0 {
		_ = h.RedisService.SetCases(ctx, cacheKey, cases, 15*time.Minute)
	}

	found := ""
	if searchResult != nil {
		found = searchResult.Found
	}

	c.JSON(http.StatusOK, gin.H{
		"data": cases,
		"meta": gin.H{"source": "indiankanoon_api", "pagenum": pageNum, "count": len(cases), "found": found},
	})
}

// GET /api/v1/indian-cases/:docid
func (h *CaseHandler) GetIndianCase(c *gin.Context) {
	ctx := c.Request.Context()
	docID := c.Param("docid")

	// Check Redis
	cacheKey := "ik:doc:" + docID
	cached, err := h.RedisService.GetCase(ctx, cacheKey)
	if err == nil && cached != nil {
		c.JSON(http.StatusOK, gin.H{"data": cached, "meta": gin.H{"source": "cache"}})
		return
	}

	// Fetch from IK API
	caseRecord, err := h.IndianKanoonService.GetDocument(ctx, docID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch Indian Kanoon document: " + err.Error()})
		return
	}

	// Cache it
	_ = h.RedisService.SetCase(ctx, cacheKey, caseRecord, 1*time.Hour)

	c.JSON(http.StatusOK, gin.H{"data": caseRecord, "meta": gin.H{"source": "indiankanoon_api"}})
}

// GET /api/v1/indian-cases/:docid/meta
func (h *CaseHandler) GetIndianCaseMeta(c *gin.Context) {
	ctx := c.Request.Context()
	docID := c.Param("docid")

	meta, err := h.IndianKanoonService.GetDocMeta(ctx, docID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch IK doc meta: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": meta, "meta": gin.H{"source": "indiankanoon_api"}})
}

// GET /api/v1/indian-cases/:docid/fragment?q=
func (h *CaseHandler) GetIndianCaseFragment(c *gin.Context) {
	ctx := c.Request.Context()
	docID := c.Param("docid")
	q := c.Query("q")

	if q == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required for fragments"})
		return
	}

	frag, err := h.IndianKanoonService.GetDocFragment(ctx, docID, q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch IK doc fragment: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": frag, "meta": gin.H{"source": "indiankanoon_api"}})
}

// ============================================================
// eCourtsIndia Handlers
// ============================================================

// GET /api/v1/ecourts/search
func (h *CaseHandler) SearchECourtsCases(c *gin.Context) {
	ctx := c.Request.Context()

	params := services.ECSearchParams{
		Query:          c.Query("q"),
		Advocates:      c.Query("advocates"),
		Judges:         c.Query("judges"),
		Petitioners:    c.Query("petitioners"),
		Respondents:    c.Query("respondents"),
		Litigants:      c.Query("litigants"),
		CourtCodes:     c.Query("courtCodes"),
		CaseStatuses:   c.Query("caseStatuses"),
		FilingDateFrom: c.Query("filingDateFrom"),
		FilingDateTo:   c.Query("filingDateTo"),
	}

	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	params.PageSize = pageSize
	params.Page = page

	// Need at least one search param
	if params.Query == "" && params.Advocates == "" && params.Judges == "" &&
		params.Petitioners == "" && params.Respondents == "" && params.Litigants == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one search parameter is required"})
		return
	}

	// Check Redis cache
	cacheKey := fmt.Sprintf("ec:search:q=%s:a=%s:j=%s:p=%d:ps=%d", params.Query, params.Advocates, params.Judges, page, pageSize)
	cachedCases, err := h.RedisService.GetCases(ctx, cacheKey)
	if err == nil && cachedCases != nil {
		c.JSON(http.StatusOK, gin.H{"data": cachedCases, "meta": gin.H{"source": "cache"}})
		return
	}

	result, err := h.ECourtsService.SearchCases(ctx, params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search eCourts: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result,
		"meta": gin.H{"source": "ecourts_api", "page": page, "totalHits": result.TotalHits},
	})
}

// GET /api/v1/ecourts/case/:cnr
func (h *CaseHandler) GetECourtsCase(c *gin.Context) {
	ctx := c.Request.Context()
	cnr := c.Param("cnr")

	detail, err := h.ECourtsService.GetCaseDetail(ctx, cnr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch eCourts case: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": detail, "meta": gin.H{"source": "ecourts_api"}})
}

// GET /api/v1/ecourts/case/:cnr/order-ai/:filename
func (h *CaseHandler) GetECourtsOrderAI(c *gin.Context) {
	ctx := c.Request.Context()
	cnr := c.Param("cnr")
	filename := c.Param("filename")

	orderAI, err := h.ECourtsService.GetOrderAI(ctx, cnr, filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch order AI: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": orderAI, "meta": gin.H{"source": "ecourts_api"}})
}

// GET /api/v1/ecourts/courts/states
func (h *CaseHandler) GetCourtStates(c *gin.Context) {
	ctx := c.Request.Context()

	states, err := h.ECourtsService.GetCourtStates(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch court states: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": states, "meta": gin.H{"source": "ecourts_api"}})
}

// GET /api/v1/ecourts/causelist/search
func (h *CaseHandler) SearchCauseList(c *gin.Context) {
	ctx := c.Request.Context()

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	params := services.ECCauseListParams{
		Query:        c.Query("q"),
		State:        c.Query("state"),
		DistrictCode: c.Query("districtCode"),
		Judge:        c.Query("judge"),
		Advocate:     c.Query("advocate"),
		Date:         c.Query("date"),
		StartDate:    c.Query("startDate"),
		EndDate:      c.Query("endDate"),
		Limit:        limit,
		Offset:       offset,
	}

	result, err := h.ECourtsService.SearchCauseList(ctx, params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search cause list: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result, "meta": gin.H{"source": "ecourts_api"}})
}

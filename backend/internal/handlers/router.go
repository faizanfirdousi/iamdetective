package handlers

import (
	"github.com/gin-gonic/gin"
)

// RegisterRoutes sets up all route groups on the Gin engine.
func RegisterRoutes(router *gin.Engine, caseHandler *CaseHandler) {
	// API v1 group
	v1 := router.Group("/api/v1")
	{
		// Cases routes
		cases := v1.Group("/cases")
		{
			cases.GET("/search", caseHandler.SearchCases)
			cases.GET("/:id", caseHandler.GetCase)
			cases.GET("/:id/related", caseHandler.GetRelatedCases)
		}
	}

	// Health check (top-level, outside versioned API)
	router.GET("/health", HealthCheck)
}

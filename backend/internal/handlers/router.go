package handlers

import (
	"github.com/gin-gonic/gin"
)

// RegisterRoutes sets up all route groups on the Gin engine.
func RegisterRoutes(router *gin.Engine, caseHandler *CaseHandler) {
	// API v1 group
	v1 := router.Group("/api/v1")
	{
		// US Cases routes (CourtListener)
		cases := v1.Group("/cases")
		{
			cases.GET("/search", caseHandler.SearchCases)
			cases.GET("/:id", caseHandler.GetCase)
			cases.GET("/:id/related", caseHandler.GetRelatedCases)
		}

		// Indian Cases routes (Indian Kanoon)
		indianCases := v1.Group("/indian-cases")
		{
			indianCases.GET("/search", caseHandler.SearchIndianCases)
			indianCases.GET("/:docid", caseHandler.GetIndianCase)
			indianCases.GET("/:docid/meta", caseHandler.GetIndianCaseMeta)
			indianCases.GET("/:docid/fragment", caseHandler.GetIndianCaseFragment)
		}

		// eCourtsIndia routes
		ecourts := v1.Group("/ecourts")
		{
			ecourts.GET("/search", caseHandler.SearchECourtsCases)
			ecourts.GET("/case/:cnr", caseHandler.GetECourtsCase)
			ecourts.GET("/case/:cnr/order-ai/:filename", caseHandler.GetECourtsOrderAI)
			ecourts.GET("/courts/states", caseHandler.GetCourtStates)
			ecourts.GET("/causelist/search", caseHandler.SearchCauseList)
		}
	}

	// Health check (top-level, outside versioned API)
	router.GET("/health", HealthCheck)
}

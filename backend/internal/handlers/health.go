package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/iamdetective/backend/internal/models"
)

// HealthCheck godoc
// @Summary      Health check
// @Description  Returns server health status
// @Tags         system
// @Produce      json
// @Success      200  {object}  models.HealthResponse
// @Router       /health [get]
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, models.HealthResponse{
		Status:  "ok",
		Service: "iamdetective-api",
	})
}

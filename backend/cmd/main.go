package main

import (
	"database/sql"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/iamdetective/backend/internal/handlers"
	"github.com/iamdetective/backend/internal/repository"
	"github.com/iamdetective/backend/internal/services"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
)

func main() {
	// 1. Load Environment Variables
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using system environment variables")
	}

	mode := os.Getenv("GIN_MODE")
	if mode != "" {
		gin.SetMode(mode)
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379" // Default fallback
	}

	clToken := os.Getenv("COURTLISTENER_API_TOKEN")

	// 2. Initialize Database (Postgres)
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to open DB: %v", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping DB: %v", err)
	}
	log.Println("PostgreSQL connected successfully")

	// 3. Initialize Redis
	redisClient := redis.NewClient(&redis.Options{
		Addr: redisURL,
	})
	defer redisClient.Close()
	log.Println("Redis client initialized")

	// 4. Initialize Repositories & Services
	caseRepo := repository.NewCaseRepository(db)
	redisService := services.NewRedisService(redisClient)
	clService := services.NewCourtListenerService(clToken)

	// 5. Initialize Handlers
	caseHandler := handlers.NewCaseHandler(caseRepo, redisService, clService)

	// 6. Setup Router
	router := gin.Default()

	// CORS middleware — allow Next.js frontend to call the API
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
		c.Header("Access-Control-Max-Age", "86400")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	handlers.RegisterRoutes(router, caseHandler) // Pass handlers into router

	// 7. Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🕵️ I Am Detective API starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

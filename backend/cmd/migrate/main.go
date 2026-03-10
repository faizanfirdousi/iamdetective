package main

import (
	"database/sql"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"sort"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found or couldn't be loaded, using system environment variables")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set in environment")
	}

	log.Printf("Connecting to database...")
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to open db connection: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping db: %v", err)
	}
	log.Println("Connected successfully.")

	// Create a table to track applied migrations
	if err := createMigrationsTable(db); err != nil {
		log.Fatalf("Failed to create migrations table: %v", err)
	}

	// Read migration files
	migrationsDir := "migrations"
	files, err := ioutil.ReadDir(migrationsDir)
	if err != nil {
		log.Fatalf("Failed to read migrations directory: %v", err)
	}

	// Sort files alphabetically to ensure correct run order (001, 002, etc.)
	var fileNames []string
	for _, f := range files {
		if !f.IsDir() && filepath.Ext(f.Name()) == ".sql" {
			fileNames = append(fileNames, f.Name())
		}
	}
	sort.Strings(fileNames)

	// Execute each file if not already applied
	for _, fileName := range fileNames {
		applied, err := isMigrationApplied(db, fileName)
		if err != nil {
			log.Fatalf("Error checking migration status for %s: %v", fileName, err)
		}

		if applied {
			log.Printf("Skipping %s (already applied)", fileName)
			continue
		}

		log.Printf("Applying %s ...", fileName)
		filePath := filepath.Join(migrationsDir, fileName)
		content, err := ioutil.ReadFile(filePath)
		if err != nil {
			log.Fatalf("Failed to read file %s: %v", filePath, err)
		}

		// Execute the SQL
		if _, err := db.Exec(string(content)); err != nil {
			log.Fatalf("Failed to execute %s: %v", fileName, err)
		}

		// Record the migration
		if err := recordMigration(db, fileName); err != nil {
			log.Fatalf("Failed to record migration %s: %v", fileName, err)
		}

		log.Printf("✓ Successfully applied %s", fileName)
	}

	log.Println("All migrations applied successfully!")
}

func createMigrationsTable(db *sql.DB) error {
	query := `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			id SERIAL PRIMARY KEY,
			filename VARCHAR(255) UNIQUE NOT NULL,
			applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
	`
	_, err := db.Exec(query)
	return err
}

func isMigrationApplied(db *sql.DB, filename string) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE filename = $1)`
	err := db.QueryRow(query, filename).Scan(&exists)
	return exists, err
}

func recordMigration(db *sql.DB, filename string) error {
	query := `INSERT INTO schema_migrations (filename) VALUES ($1)`
	_, err := db.Exec(query, filename)
	return err
}

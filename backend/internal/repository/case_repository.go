package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/iamdetective/backend/internal/models"
	"github.com/lib/pq"
)

var (
	ErrNotFound  = errors.New("record not found")
	ErrDuplicate = errors.New("duplicate record")
)

type CaseFilters struct {
	Jurisdiction string
	Status       string
	CaseType     string
	Source       string
	DateFrom     string // YYYY-MM-DD
	DateTo       string // YYYY-MM-DD
}

type CaseRepository interface {
	CreateCase(ctx context.Context, c *models.CaseSchema) error
	GetCaseByID(ctx context.Context, id string) (*models.CaseSchema, error)
	SearchCases(ctx context.Context, query string, filters CaseFilters) ([]*models.CaseSchema, error)
	ListCases(ctx context.Context, limit, offset int) ([]*models.CaseSchema, error)
	UpdateCase(ctx context.Context, c *models.CaseSchema) error
}

type caseRepository struct {
	db *sql.DB
}

func NewCaseRepository(db *sql.DB) CaseRepository {
	return &caseRepository{db: db}
}

func (r *caseRepository) CreateCase(ctx context.Context, c *models.CaseSchema) error {
	query := `
		INSERT INTO cases (
			id, title, source, jurisdiction, case_type, parties, charges, 
			status, filed_date, summary, full_text, source_url, tags, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
		)
	`

	// Convert Go string slices to pq.StringArray for Postgres TEXT[] mapping
	partiesSlice := pq.Array(c.Parties)
	chargesSlice := pq.Array(c.Charges)
	tagsSlice := pq.Array(c.Tags)

	_, err := r.db.ExecContext(ctx, query,
		c.ID, c.Title, c.Source, c.Jurisdiction, c.CaseType, partiesSlice, chargesSlice,
		c.Status, c.FiledDate, c.Summary, c.FullText, c.SourceURL, tagsSlice,
	)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" { // unique_violation
			return ErrDuplicate
		}
		return err
	}
	return nil
}

func (r *caseRepository) GetCaseByID(ctx context.Context, id string) (*models.CaseSchema, error) {
	query := `
		SELECT id, title, source, jurisdiction, case_type, parties, charges, 
		       status, filed_date, summary, full_text, source_url, tags
		FROM cases WHERE id = $1
	`

	c := &models.CaseSchema{}
	var partiesSlice, chargesSlice, tagsSlice pq.StringArray

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&c.ID, &c.Title, &c.Source, &c.Jurisdiction, &c.CaseType, &partiesSlice, &chargesSlice,
		&c.Status, &c.FiledDate, &c.Summary, &c.FullText, &c.SourceURL, &tagsSlice,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	c.Parties = []string(partiesSlice)
	c.Charges = []string(chargesSlice)
	c.Tags = []string(tagsSlice)

	return c, nil
}

func (r *caseRepository) SearchCases(ctx context.Context, searchQuery string, filters CaseFilters) ([]*models.CaseSchema, error) {
	// Start building dynamic query securely using parameterized arguments
	var conditions []string
	var args []interface{}
	argCount := 1

	query := `SELECT id, title, source, jurisdiction, case_type, parties, charges, 
			  status, filed_date, summary, full_text, source_url, tags 
			  FROM cases WHERE 1=1`

	if searchQuery != "" {
		// Use ILIKE for case-insensitive search across title and summary.
		// In a real production system we migrate this to Postgres tsvector indexing.
		conditions = append(conditions, fmt.Sprintf("(title ILIKE $%d OR summary ILIKE $%d OR full_text ILIKE $%d)", argCount, argCount, argCount))
		likeQuery := "%" + searchQuery + "%"
		args = append(args, likeQuery)
		argCount++
	}

	if filters.Jurisdiction != "" {
		conditions = append(conditions, fmt.Sprintf("jurisdiction = $%d", argCount))
		args = append(args, filters.Jurisdiction)
		argCount++
	}

	if filters.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argCount))
		args = append(args, filters.Status)
		argCount++
	}

	if filters.CaseType != "" {
		conditions = append(conditions, fmt.Sprintf("case_type = $%d", argCount))
		args = append(args, filters.CaseType)
		argCount++
	}

	if filters.Source != "" {
		conditions = append(conditions, fmt.Sprintf("source = $%d", argCount))
		args = append(args, filters.Source)
		argCount++
	}

	if filters.DateFrom != "" {
		conditions = append(conditions, fmt.Sprintf("filed_date >= $%d", argCount))
		args = append(args, filters.DateFrom)
		argCount++
	}

	if filters.DateTo != "" {
		conditions = append(conditions, fmt.Sprintf("filed_date <= $%d", argCount))
		args = append(args, filters.DateTo)
		argCount++
	}

	if len(conditions) > 0 {
		query += " AND " + strings.Join(conditions, " AND ")
	}

	query += fmt.Sprintf(" ORDER BY filed_date DESC LIMIT 100") // Cap maximum return size for safety

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cases []*models.CaseSchema
	for rows.Next() {
		c := &models.CaseSchema{}
		var partiesSlice, chargesSlice, tagsSlice pq.StringArray

		err := rows.Scan(
			&c.ID, &c.Title, &c.Source, &c.Jurisdiction, &c.CaseType, &partiesSlice, &chargesSlice,
			&c.Status, &c.FiledDate, &c.Summary, &c.FullText, &c.SourceURL, &tagsSlice,
		)
		if err != nil {
			return nil, err
		}

		c.Parties = []string(partiesSlice)
		c.Charges = []string(chargesSlice)
		c.Tags = []string(tagsSlice)
		cases = append(cases, c)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return cases, nil
}

func (r *caseRepository) ListCases(ctx context.Context, limit, offset int) ([]*models.CaseSchema, error) {
	query := `
		SELECT id, title, source, jurisdiction, case_type, parties, charges, 
		       status, filed_date, summary, full_text, source_url, tags
		FROM cases ORDER BY filed_date DESC LIMIT $1 OFFSET $2
	`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cases []*models.CaseSchema
	for rows.Next() {
		c := &models.CaseSchema{}
		var partiesSlice, chargesSlice, tagsSlice pq.StringArray

		err := rows.Scan(
			&c.ID, &c.Title, &c.Source, &c.Jurisdiction, &c.CaseType, &partiesSlice, &chargesSlice,
			&c.Status, &c.FiledDate, &c.Summary, &c.FullText, &c.SourceURL, &tagsSlice,
		)
		if err != nil {
			return nil, err
		}

		c.Parties = []string(partiesSlice)
		c.Charges = []string(chargesSlice)
		c.Tags = []string(tagsSlice)
		cases = append(cases, c)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return cases, nil
}

func (r *caseRepository) UpdateCase(ctx context.Context, c *models.CaseSchema) error {
	query := `
		UPDATE cases 
		SET title = $1, source = $2, jurisdiction = $3, case_type = $4, parties = $5, 
		    charges = $6, status = $7, filed_date = $8, summary = $9, full_text = $10, 
		    source_url = $11, tags = $12
		WHERE id = $13
	`

	partiesSlice := pq.Array(c.Parties)
	chargesSlice := pq.Array(c.Charges)
	tagsSlice := pq.Array(c.Tags)

	res, err := r.db.ExecContext(ctx, query,
		c.Title, c.Source, c.Jurisdiction, c.CaseType, partiesSlice, chargesSlice,
		c.Status, c.FiledDate, c.Summary, c.FullText, c.SourceURL, tagsSlice, c.ID,
	)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" { // unique_violation
			return ErrDuplicate
		}
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

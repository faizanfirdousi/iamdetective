package models

import (
	"time"

	"github.com/google/uuid"
)

// Event represents a specific occurrence in a case timeline.
type Event struct {
	ID          uuid.UUID `json:"id" db:"id"`
	CaseID      uuid.UUID `json:"case_id" db:"case_id"` // FK to CaseSchema
	Title       string    `json:"title" db:"title"`
	Description string    `json:"description,omitempty" db:"description"`
	OccurredAt  time.Time `json:"occurred_at" db:"occurred_at"`
	EventType   string    `json:"event_type" db:"event_type"` // arrest, hearing, verdict, crime, evidence
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

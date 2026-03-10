package models

import (
	"time"

	"github.com/google/uuid"
)

// Annotation represents a user's private note on a case dossier.
type Annotation struct {
	ID             uuid.UUID `json:"id" db:"id"`
	CaseID         uuid.UUID `json:"case_id" db:"case_id"`             // FK to CaseSchema
	UserID         uuid.UUID `json:"user_id" db:"user_id"`             // FK to User
	SelectedText   string    `json:"selected_text" db:"selected_text"` // Text the user highlighted
	Note           string    `json:"note" db:"note"`                   // The user's annotation
	HighlightColor string    `json:"highlight_color,omitempty" db:"highlight_color"`
	PageSection    string    `json:"page_section,omitempty" db:"page_section"` // Context of where the highlight is
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

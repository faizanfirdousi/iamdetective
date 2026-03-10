package models

import (
	"time"

	"github.com/google/uuid"
)

// Person represents an individual involved in a case.
type Person struct {
	ID          uuid.UUID `json:"id" db:"id"`
	CaseID      uuid.UUID `json:"case_id" db:"case_id"` // FK to CaseSchema
	Name        string    `json:"name" db:"name"`
	Role        string    `json:"role" db:"role"`         // suspect, victim, witness, judge, attorney
	DOB         string    `json:"dob,omitempty" db:"dob"` // Date of birth (string to allow partial dates)
	Nationality string    `json:"nationality,omitempty" db:"nationality"`
	Description string    `json:"description,omitempty" db:"description"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

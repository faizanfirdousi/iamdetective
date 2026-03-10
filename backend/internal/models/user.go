package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents an application user (detective).
type User struct {
	ID           uuid.UUID `json:"id" db:"id"`
	Email        string    `json:"email" db:"email"`
	DisplayName  string    `json:"display_name" db:"display_name"`
	PasswordHash string    `json:"-" db:"password_hash"` // Never serialize to JSON
	AvatarURL    string    `json:"avatar_url,omitempty" db:"avatar_url"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

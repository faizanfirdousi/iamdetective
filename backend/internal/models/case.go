package models

import "time"

// CaseSchema represents a unified criminal case from any data source
// (CourtListener, FBI Crime Data, or UK National Archives).
type CaseSchema struct {
	ID           string    `json:"id" db:"id"`
	Title        string    `json:"title" db:"title"`
	Source       string    `json:"source" db:"source"`             // e.g., "courtlistener", "fbi", "uk_archives"
	Jurisdiction string    `json:"jurisdiction" db:"jurisdiction"` // e.g., "federal", "ny_state", "uk"
	CaseType     string    `json:"case_type" db:"case_type"`       // e.g., "criminal", "civil", "appeals"
	Parties      []string  `json:"parties" db:"parties"`
	Charges      []string  `json:"charges" db:"charges"`
	Status       string    `json:"status" db:"status"` // "open" or "closed"
	FiledDate    time.Time `json:"filed_date" db:"filed_date"`
	Summary      string    `json:"summary" db:"summary"`
	FullText     string    `json:"full_text" db:"full_text"`
	SourceURL    string    `json:"source_url" db:"source_url"` // Original URL to the case file
	Tags         []string  `json:"tags" db:"tags"`
}

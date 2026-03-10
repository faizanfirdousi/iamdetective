package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/iamdetective/backend/internal/models"
)

type CourtListenerService interface {
	SearchCases(ctx context.Context, query string, limit int) ([]*models.CaseSchema, error)
	GetRelatedCases(ctx context.Context, partyName string, limit int) ([]*models.CaseSchema, error)
}

type courtListenerService struct {
	apiToken string
	baseURL  string
	client   *http.Client
}

func NewCourtListenerService(apiToken string) CourtListenerService {
	return &courtListenerService{
		apiToken: apiToken,
		baseURL:  "https://www.courtlistener.com/api/rest/v4",
		client:   &http.Client{Timeout: 10 * time.Second},
	}
}

// Search api/rest/v4/search/ returns opinions.
func (s *courtListenerService) SearchCases(ctx context.Context, query string, limit int) ([]*models.CaseSchema, error) {
	// Simple integration: search opinions
	endpoint := fmt.Sprintf("%s/search/?type=o&q=%s", s.baseURL, url.QueryEscape(query))

	req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, err
	}

	if s.apiToken != "" {
		req.Header.Add("Authorization", fmt.Sprintf("Token %s", s.apiToken))
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("courtlistener api returned status: %d", resp.StatusCode)
	}

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// This assumes the search endpoint returns a JSON with an array of "results".
	var raw struct {
		Results []struct {
			ID        int    `json:"id"`
			URL       string `json:"absolute_url"`
			CaseName  string `json:"caseName"`
			DateFiled string `json:"dateFiled"`
			Court     string `json:"court"`
			Snippet   string `json:"snippet"`
		} `json:"results"`
	}

	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, fmt.Errorf("failed to parse courtlistener search response: %v", err)
	}

	var cases []*models.CaseSchema
	for i, r := range raw.Results {
		if i >= limit {
			break
		}

		filedDate, _ := time.Parse("2006-01-02T15:04:05Z", r.DateFiled)
		if filedDate.IsZero() {
			filedDate = time.Now()
		}

		c := &models.CaseSchema{
			ID:           uuid.New().String(), // Generate a UUID or map external ID deterministically
			Title:        r.CaseName,
			Source:       "courtlistener",
			Jurisdiction: r.Court,
			CaseType:     "unknown",
			Status:       "unknown",
			FiledDate:    filedDate,
			Summary:      r.Snippet,
			SourceURL:    fmt.Sprintf("https://www.courtlistener.com%s", r.URL),
		}

		if c.Title == "" { // Fallback if caseName isn't cleanly separated
			c.Title = fmt.Sprintf("CourtListener Case #%d", r.ID)
		}

		cases = append(cases, c)
	}

	return cases, nil
}

func (s *courtListenerService) GetRelatedCases(ctx context.Context, partyName string, limit int) ([]*models.CaseSchema, error) {
	log.Printf("Searching CourtListener related cases for party: %s", partyName)
	// We use the standard search endpoint query focusing on the name as a simple related case proxy
	// A proper implementation might query the /parties/ endpoint.
	parts := strings.Split(partyName, " ")
	lastName := parts[len(parts)-1] // very basic parsing for broad matching
	return s.SearchCases(ctx, fmt.Sprintf("party:\"%s\"", lastName), limit)
}

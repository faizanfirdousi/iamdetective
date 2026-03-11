package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"time"

	"github.com/google/uuid"
	"github.com/iamdetective/backend/internal/models"
)

// IKSearchDoc represents a single document in the IK search response.
type IKSearchDoc struct {
	TID       int    `json:"tid"`
	Title     string `json:"title"`
	Headline  string `json:"headline"`
	DocSource string `json:"docsource"`
	DocSize   int    `json:"docsize"`
}

// IKSearchResult represents the JSON response from IK's /search/ endpoint.
type IKSearchResult struct {
	Docs             []IKSearchDoc `json:"docs"`
	Found            string        `json:"found"`
	EncodedFormInput string        `json:"encodedformInput"`
	Categories       []interface{} `json:"categories"`
}

// IKDocMeta represents metadata returned from the /docmeta/ endpoint.
type IKDocMeta struct {
	TID         int      `json:"tid"`
	Title       string   `json:"title"`
	Author      string   `json:"author"`
	Bench       string   `json:"bench"`
	DocSource   string   `json:"docsource"`
	CiteList    []IKCite `json:"citeList"`
	CitedByList []IKCite `json:"citedbyList"`
}

// IKCite represents a citation entry.
type IKCite struct {
	TID   int    `json:"tid"`
	Title string `json:"title"`
}

// IKDocFragment represents the response from /docfragment/.
type IKDocFragment struct {
	TID       int    `json:"tid"`
	Title     string `json:"title"`
	Headline  string `json:"headline"`
	FormInput string `json:"formInput"`
}

// IndianKanoonService defines the interface for IK API interactions.
type IndianKanoonService interface {
	SearchCases(ctx context.Context, query string, pageNum int) (*IKSearchResult, []*models.CaseSchema, error)
	GetDocument(ctx context.Context, docID string) (*models.CaseSchema, error)
	GetDocMeta(ctx context.Context, docID string) (*IKDocMeta, error)
	GetDocFragment(ctx context.Context, docID, query string) (*IKDocFragment, error)
}

type indianKanoonService struct {
	apiToken string
	baseURL  string
	client   *http.Client
}

// NewIndianKanoonService creates a new IK API client.
func NewIndianKanoonService(apiToken string) IndianKanoonService {
	return &indianKanoonService{
		apiToken: apiToken,
		baseURL:  "https://api.indiankanoon.org",
		client:   &http.Client{Timeout: 15 * time.Second},
	}
}

// doRequest makes an authenticated request to the IK API.
func (s *indianKanoonService) doRequest(ctx context.Context, endpoint string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("ik: failed to create request: %w", err)
	}

	if s.apiToken != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Token %s", s.apiToken))
	}
	req.Header.Set("Accept", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ik: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusForbidden {
		return nil, fmt.Errorf("ik: authentication failed (403) — check your INDIANKANOON_API_TOKEN")
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ik: API returned status %d", resp.StatusCode)
	}

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("ik: failed to read response body: %w", err)
	}

	return body, nil
}

// SearchCases queries the IK search API and maps results to CaseSchema.
func (s *indianKanoonService) SearchCases(ctx context.Context, query string, pageNum int) (*IKSearchResult, []*models.CaseSchema, error) {
	endpoint := fmt.Sprintf("%s/search/?formInput=%s&pagenum=%d",
		s.baseURL, url.QueryEscape(query), pageNum)

	log.Printf("IK Search: %s (page %d)", query, pageNum)

	body, err := s.doRequest(ctx, endpoint)
	if err != nil {
		return nil, nil, err
	}

	var result IKSearchResult
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, nil, fmt.Errorf("ik: failed to parse search response: %w", err)
	}

	// Map IK docs to our unified CaseSchema
	var cases []*models.CaseSchema
	for _, doc := range result.Docs {
		c := &models.CaseSchema{
			ID:           uuid.NewSHA1(uuid.NameSpaceURL, []byte(fmt.Sprintf("ik:%d", doc.TID))).String(),
			Title:        doc.Title,
			Source:       "indiankanoon",
			Jurisdiction: doc.DocSource,
			CaseType:     "judgment",
			Status:       "closed",   // IK mostly has decided cases
			FiledDate:    time.Now(), // IK search doesn't return dates directly
			Summary:      doc.Headline,
			SourceURL:    fmt.Sprintf("https://indiankanoon.org/doc/%d/", doc.TID),
			Tags:         []string{fmt.Sprintf("ik_tid:%d", doc.TID)},
		}

		if c.Title == "" {
			c.Title = fmt.Sprintf("Indian Kanoon Document #%d", doc.TID)
		}

		cases = append(cases, c)
	}

	return &result, cases, nil
}

// GetDocument fetches the full document text from IK.
func (s *indianKanoonService) GetDocument(ctx context.Context, docID string) (*models.CaseSchema, error) {
	endpoint := fmt.Sprintf("%s/doc/%s/", s.baseURL, docID)

	log.Printf("IK GetDocument: %s", docID)

	body, err := s.doRequest(ctx, endpoint)
	if err != nil {
		return nil, err
	}

	var raw struct {
		Doc   string `json:"doc"`
		Title string `json:"title"`
		TID   int    `json:"tid"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, fmt.Errorf("ik: failed to parse document response: %w", err)
	}

	c := &models.CaseSchema{
		ID:           uuid.NewSHA1(uuid.NameSpaceURL, []byte(fmt.Sprintf("ik:%d", raw.TID))).String(),
		Title:        raw.Title,
		Source:       "indiankanoon",
		Jurisdiction: "India",
		CaseType:     "judgment",
		Status:       "closed",
		FiledDate:    time.Now(),
		FullText:     raw.Doc,
		SourceURL:    fmt.Sprintf("https://indiankanoon.org/doc/%s/", docID),
		Tags:         []string{fmt.Sprintf("ik_tid:%d", raw.TID)},
	}

	return c, nil
}

// GetDocMeta fetches document metadata (citations, bench, author) from IK.
func (s *indianKanoonService) GetDocMeta(ctx context.Context, docID string) (*IKDocMeta, error) {
	endpoint := fmt.Sprintf("%s/docmeta/%s/", s.baseURL, docID)

	log.Printf("IK GetDocMeta: %s", docID)

	body, err := s.doRequest(ctx, endpoint)
	if err != nil {
		return nil, err
	}

	var meta IKDocMeta
	if err := json.Unmarshal(body, &meta); err != nil {
		return nil, fmt.Errorf("ik: failed to parse docmeta response: %w", err)
	}

	return &meta, nil
}

// GetDocFragment fetches highlighted search fragments within a document.
func (s *indianKanoonService) GetDocFragment(ctx context.Context, docID, query string) (*IKDocFragment, error) {
	endpoint := fmt.Sprintf("%s/docfragment/%s/?formInput=%s",
		s.baseURL, docID, url.QueryEscape(query))

	log.Printf("IK GetDocFragment: doc=%s, query=%s", docID, query)

	body, err := s.doRequest(ctx, endpoint)
	if err != nil {
		return nil, err
	}

	var frag IKDocFragment
	if err := json.Unmarshal(body, &frag); err != nil {
		return nil, fmt.Errorf("ik: failed to parse docfragment response: %w", err)
	}

	return &frag, nil
}

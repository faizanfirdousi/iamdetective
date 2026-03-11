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
)

// ============================================================
// eCourtsIndia Response Types
// ============================================================

// ECSearchResult is the response from /api/partner/search.
type ECSearchResult struct {
	Results     []ECSearchCase `json:"results"`
	TotalHits   int            `json:"totalHits"`
	Page        int            `json:"page"`
	PageSize    int            `json:"pageSize"`
	TotalPages  int            `json:"totalPages"`
	HasNextPage bool           `json:"hasNextPage"`
	Facets      map[string]struct {
		Values  map[string]int `json:"values"`
		HasMore bool           `json:"hasMore"`
	} `json:"facets"`
}

// ECSearchCase is a single result from eCourts search.
type ECSearchCase struct {
	CNR                 string   `json:"cnr"`
	CaseType            string   `json:"caseType"`
	CaseStatus          string   `json:"caseStatus"`
	FilingDate          string   `json:"filingDate"`
	NextHearingDate     string   `json:"nextHearingDate"`
	Judges              []string `json:"judges"`
	Petitioners         []string `json:"petitioners"`
	Respondents         []string `json:"respondents"`
	PetitionerAdvocates []string `json:"petitionerAdvocates"`
	RespondentAdvocates []string `json:"respondentAdvocates"`
	ActsAndSections     []string `json:"actsAndSections"`
	CourtCode           string   `json:"courtCode"`
	JudicialSection     string   `json:"judicialSection"`
	AIKeywords          []string `json:"aiKeywords"`
}

// BuildTitle constructs a display title from petitioners vs respondents.
func (c *ECSearchCase) BuildTitle() string {
	pet := "Unknown"
	if len(c.Petitioners) > 0 {
		pet = c.Petitioners[0]
	}
	resp := "Unknown"
	if len(c.Respondents) > 0 {
		resp = c.Respondents[0]
	}
	title := fmt.Sprintf("%s vs %s", pet, resp)
	if len(c.Petitioners) > 1 || len(c.Respondents) > 1 {
		title += " & Ors."
	}
	return title
}

// ECCaseDetail is the full case response from /api/partner/case/{cnr}.
type ECCaseDetail struct {
	CourtCaseData  ECCourtCaseData `json:"courtCaseData"`
	EntityInfo     ECEntityInfo    `json:"entityInfo"`
	Files          ECFiles         `json:"files"`
	CaseAIAnalysis *ECAIAnalysis   `json:"caseAiAnalysis"`
}

type ECCourtCaseData struct {
	CNR                 string   `json:"cnr"`
	CaseNumber          string   `json:"caseNumber"`
	CaseType            string   `json:"caseType"`
	CaseStatus          string   `json:"caseStatus"`
	FilingDate          string   `json:"filingDate"`
	RegistrationDate    string   `json:"registrationDate"`
	FirstHearingDate    string   `json:"firstHearingDate"`
	NextHearingDate     string   `json:"nextHearingDate"`
	DecisionDate        *string  `json:"decisionDate"`
	Judges              []string `json:"judges"`
	Petitioners         []string `json:"petitioners"`
	PetitionerAdvocates []string `json:"petitionerAdvocates"`
	Respondents         []string `json:"respondents"`
	RespondentAdvocates []string `json:"respondentAdvocates"`
	ActsAndSections     string   `json:"actsAndSections"`
	CourtName           string   `json:"courtName"`
	State               string   `json:"state"`
	District            string   `json:"district"`
	CourtNo             int      `json:"courtNo"`
	BenchName           string   `json:"benchName"`
	Purpose             string   `json:"purpose"`
	JudicialSection     string   `json:"judicialSection"`
}

type ECEntityInfo struct {
	CNR               string `json:"cnr"`
	NextDateOfHearing string `json:"nextDateOfHearing"`
	DateCreated       string `json:"dateCreated"`
	DateModified      string `json:"dateModified"`
}

type ECFiles struct {
	Files []ECFileEntry `json:"files"`
}

type ECFileEntry struct {
	PDFFile         string           `json:"pdfFile"`
	MarkdownContent string           `json:"markdownContent"`
	AIAnalysis      *ECOrderAIDetail `json:"aiAnalysis"`
}

type ECAIAnalysis struct {
	CaseSummary string   `json:"caseSummary"`
	CaseType    string   `json:"caseType"`
	Complexity  string   `json:"complexity"`
	KeyIssues   []string `json:"keyIssues"`
}

// ECOrderAI is the response from /api/partner/case/{cnr}/order-ai/{filename}.
type ECOrderAI struct {
	CNR           string           `json:"cnr"`
	Filename      string           `json:"filename"`
	ExtractedText string           `json:"extractedText"`
	AIAnalysis    *ECOrderAIDetail `json:"aiAnalysis"`
}

type ECOrderAIDetail struct {
	Summary         string            `json:"summary"`
	OrderType       string            `json:"orderType"`
	Outcome         string            `json:"outcome"`
	KeyPoints       []string          `json:"keyPoints"`
	ReliefGranted   []string          `json:"reliefGranted"`
	Parties         map[string]string `json:"parties"`
	LegalProvisions []string          `json:"legalProvisions"`
	NextSteps       string            `json:"nextSteps"`
	Judge           string            `json:"judge"`
	OrderDate       string            `json:"orderDate"`
}

// ECState from court structure endpoint.
type ECState struct {
	State     string `json:"state"`
	StateName string `json:"stateName"`
}

// ECCauseListResult from cause list search.
type ECCauseListResult struct {
	Query         string             `json:"query"`
	Results       []ECCauseListEntry `json:"results"`
	ReturnedCount int                `json:"returnedCount"`
	Limit         int                `json:"limit"`
	Offset        int                `json:"offset"`
}

type ECCauseListEntry struct {
	ID           int      `json:"id"`
	CourtType    string   `json:"courtType"`
	ListType     string   `json:"listType"`
	Bench        string   `json:"bench"`
	CourtNo      string   `json:"courtNo"`
	Date         string   `json:"date"`
	CaseNumber   []string `json:"caseNumber"`
	Party        string   `json:"party"`
	Petitioners  []string `json:"petitioners"`
	Respondents  []string `json:"respondents"`
	Advocates    []string `json:"advocates"`
	Judge        []string `json:"judge"`
	District     string   `json:"district"`
	State        string   `json:"state"`
	Status       string   `json:"status"`
	DistrictCode string   `json:"districtCode"`
	CourtName    string   `json:"courtName"`
}

// ============================================================
// Service Interface & Implementation
// ============================================================

type ECourtsService interface {
	SearchCases(ctx context.Context, params ECSearchParams) (*ECSearchResult, error)
	GetCaseDetail(ctx context.Context, cnr string) (*ECCaseDetail, error)
	GetOrderAI(ctx context.Context, cnr, filename string) (*ECOrderAI, error)
	GetCourtStates(ctx context.Context) ([]ECState, error)
	SearchCauseList(ctx context.Context, params ECCauseListParams) (*ECCauseListResult, error)
}

type ECSearchParams struct {
	Query          string
	Advocates      string
	Judges         string
	Petitioners    string
	Respondents    string
	Litigants      string
	CourtCodes     string
	CaseStatuses   string
	FilingDateFrom string
	FilingDateTo   string
	PageSize       int
	Page           int
}

type ECCauseListParams struct {
	Query        string
	State        string
	DistrictCode string
	Judge        string
	Advocate     string
	Date         string
	StartDate    string
	EndDate      string
	Limit        int
	Offset       int
}

type eCourtsService struct {
	apiToken string
	baseURL  string
	client   *http.Client
}

func NewECourtsService(apiToken string) ECourtsService {
	return &eCourtsService{
		apiToken: apiToken,
		baseURL:  "https://webapi.ecourtsindia.com",
		client:   &http.Client{Timeout: 15 * time.Second},
	}
}

func (s *eCourtsService) doRequest(ctx context.Context, method, endpoint string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, method, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("ecourts: failed to create request: %w", err)
	}

	if s.apiToken != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiToken))
	}
	req.Header.Set("Accept", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ecourts: request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("ecourts: failed to read response: %w", err)
	}

	if resp.StatusCode == 401 || resp.StatusCode == 403 {
		return nil, fmt.Errorf("ecourts: authentication failed (%d) — check ECOURTS_API_TOKEN", resp.StatusCode)
	}
	if resp.StatusCode == 402 {
		return nil, fmt.Errorf("ecourts: insufficient credits (402)")
	}
	if resp.StatusCode == 429 {
		return nil, fmt.Errorf("ecourts: rate limit exceeded (429) — try again later")
	}
	if resp.StatusCode == 404 {
		return nil, fmt.Errorf("ecourts: not found (404)")
	}
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		return nil, fmt.Errorf("ecourts: API returned status %d: %s", resp.StatusCode, string(body))
	}

	return body, nil
}

// SearchCases searches eCourts cases with filters.
func (s *eCourtsService) SearchCases(ctx context.Context, params ECSearchParams) (*ECSearchResult, error) {
	q := url.Values{}
	if params.Query != "" {
		q.Set("query", params.Query)
	}
	if params.Advocates != "" {
		q.Set("advocates", params.Advocates)
	}
	if params.Judges != "" {
		q.Set("judges", params.Judges)
	}
	if params.Petitioners != "" {
		q.Set("petitioners", params.Petitioners)
	}
	if params.Respondents != "" {
		q.Set("respondents", params.Respondents)
	}
	if params.Litigants != "" {
		q.Set("litigants", params.Litigants)
	}
	if params.CourtCodes != "" {
		for _, code := range strings.Split(params.CourtCodes, ",") {
			q.Add("courtCodes", strings.TrimSpace(code))
		}
	}
	if params.CaseStatuses != "" {
		for _, status := range strings.Split(params.CaseStatuses, ",") {
			q.Add("caseStatuses", strings.TrimSpace(status))
		}
	}
	if params.FilingDateFrom != "" {
		q.Set("filingDateFrom", params.FilingDateFrom)
	}
	if params.FilingDateTo != "" {
		q.Set("filingDateTo", params.FilingDateTo)
	}
	if params.PageSize > 0 {
		q.Set("pageSize", fmt.Sprintf("%d", params.PageSize))
	}
	if params.Page > 0 {
		q.Set("page", fmt.Sprintf("%d", params.Page))
	}

	endpoint := fmt.Sprintf("%s/api/partner/search?%s", s.baseURL, q.Encode())
	log.Printf("eCourts Search: %s", endpoint)

	body, err := s.doRequest(ctx, "GET", endpoint)
	if err != nil {
		return nil, err
	}

	var wrapper struct {
		Data ECSearchResult `json:"data"`
	}
	if err := json.Unmarshal(body, &wrapper); err != nil {
		return nil, fmt.Errorf("ecourts: failed to parse search response: %w", err)
	}

	return &wrapper.Data, nil
}

// GetCaseDetail gets full case info by CNR.
func (s *eCourtsService) GetCaseDetail(ctx context.Context, cnr string) (*ECCaseDetail, error) {
	endpoint := fmt.Sprintf("%s/api/partner/case/%s", s.baseURL, cnr)
	log.Printf("eCourts GetCase: %s", cnr)

	body, err := s.doRequest(ctx, "GET", endpoint)
	if err != nil {
		return nil, err
	}

	var wrapper struct {
		Data ECCaseDetail `json:"data"`
	}
	if err := json.Unmarshal(body, &wrapper); err != nil {
		return nil, fmt.Errorf("ecourts: failed to parse case response: %w", err)
	}

	return &wrapper.Data, nil
}

// GetOrderAI gets AI analysis of a court order.
func (s *eCourtsService) GetOrderAI(ctx context.Context, cnr, filename string) (*ECOrderAI, error) {
	endpoint := fmt.Sprintf("%s/api/partner/case/%s/order-ai/%s", s.baseURL, cnr, filename)
	log.Printf("eCourts GetOrderAI: %s / %s", cnr, filename)

	body, err := s.doRequest(ctx, "GET", endpoint)
	if err != nil {
		return nil, err
	}

	var wrapper struct {
		Data ECOrderAI `json:"data"`
	}
	if err := json.Unmarshal(body, &wrapper); err != nil {
		return nil, fmt.Errorf("ecourts: failed to parse order-ai response: %w", err)
	}

	return &wrapper.Data, nil
}

// GetCourtStates returns all states from court structure (free endpoint).
func (s *eCourtsService) GetCourtStates(ctx context.Context) ([]ECState, error) {
	endpoint := fmt.Sprintf("%s/api/CauseList/court-structure/states", s.baseURL)
	log.Printf("eCourts GetCourtStates")

	body, err := s.doRequest(ctx, "GET", endpoint)
	if err != nil {
		return nil, err
	}

	var states []ECState
	if err := json.Unmarshal(body, &states); err != nil {
		return nil, fmt.Errorf("ecourts: failed to parse states response: %w", err)
	}

	return states, nil
}

// SearchCauseList searches cause list entries.
func (s *eCourtsService) SearchCauseList(ctx context.Context, params ECCauseListParams) (*ECCauseListResult, error) {
	q := url.Values{}
	if params.Query != "" {
		q.Set("q", params.Query)
	}
	if params.State != "" {
		q.Set("state", params.State)
	}
	if params.DistrictCode != "" {
		q.Set("districtCode", params.DistrictCode)
	}
	if params.Judge != "" {
		q.Set("judge", params.Judge)
	}
	if params.Advocate != "" {
		q.Set("advocate", params.Advocate)
	}
	if params.Date != "" {
		q.Set("date", params.Date)
	}
	if params.StartDate != "" {
		q.Set("startDate", params.StartDate)
	}
	if params.EndDate != "" {
		q.Set("endDate", params.EndDate)
	}
	if params.Limit > 0 {
		q.Set("limit", fmt.Sprintf("%d", params.Limit))
	} else {
		q.Set("limit", "20")
	}
	if params.Offset > 0 {
		q.Set("offset", fmt.Sprintf("%d", params.Offset))
	}

	endpoint := fmt.Sprintf("%s/api/partner/causelist/search?%s", s.baseURL, q.Encode())
	log.Printf("eCourts CauseList: %s", endpoint)

	body, err := s.doRequest(ctx, "GET", endpoint)
	if err != nil {
		return nil, err
	}

	var wrapper struct {
		Data ECCauseListResult `json:"data"`
	}
	if err := json.Unmarshal(body, &wrapper); err != nil {
		return nil, fmt.Errorf("ecourts: failed to parse causelist response: %w", err)
	}

	return &wrapper.Data, nil
}

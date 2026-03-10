#!/bin/bash

# Configuration
BASE_URL="http://localhost:8080"
API_URL="${BASE_URL}/api/v1"

echo "=========================================================="
echo "    I AM DETECTIVE - API INTEGRATION TEST SCRIPT          "
echo "=========================================================="
echo "Pre-requisite: Make sure the backend server and redis are running"
echo "Target Base URL: $BASE_URL"
echo "----------------------------------------------------------"

# Helper function to print colored output
print_status() {
    if [ "$1" -eq 200 ] || [ "$1" -eq 0 ]; then
        echo -e "[\033[32mOK\033[0m] $2"
    else
        echo -e "[\033[31mFAIL\033[0m] $2 (Status: $1)"
        if [ "$3" == "fatal" ]; then
            echo "Exiting due to critical failure."
            exit 1
        fi
    fi
}

echo -e "\n1. Testing Health Check Endpoint"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/health")
print_status "$HEALTH_STATUS" "Health Check (/health)" "fatal"

echo -e "\n2. Testing Case Search Endpoint (Basic Query)"
SEARCH_RESPONSE=$(curl -s "${API_URL}/cases/search?q=apple")
SEARCH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/cases/search?q=apple")
print_status "$SEARCH_STATUS" "Case Search (/api/v1/cases/search?q=apple)" "fatal"

# Extracting first case ID from the response using grep/awk (no jq dependency)
FIRST_CASE_ID=$(echo "$SEARCH_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | awk -F '"' '{print $4}')

if [ -z "$FIRST_CASE_ID" ]; then
    echo -e "[\033[33mWARN\033[0m] No cases returned from search, skipping single case tests."
else
    echo "Found Case ID: $FIRST_CASE_ID"

    echo -e "\n3. Testing Single Case Retrieval"
    CASE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/cases/${FIRST_CASE_ID}")
    print_status "$CASE_STATUS" "Get Case (/api/v1/cases/${FIRST_CASE_ID})"
    
    echo -e "\n4. Testing Related Cases Retrieval"
    RELATED_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/cases/${FIRST_CASE_ID}/related")
    print_status "$RELATED_STATUS" "Related Cases (/api/v1/cases/${FIRST_CASE_ID}/related)"
fi

echo -e "\n5. Testing Pagination (Page 2, Limit 5)"
PAGINATION_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/cases/search?q=apple&page=2&limit=5")
print_status "$PAGINATION_STATUS" "Pagination (/cases/search?q=apple&page=2&limit=5)"

echo -e "\n6. Testing filtering by CourtListener source"
CL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/cases/search?source=courtlistener&q=google")
print_status "$CL_STATUS" "CourtListener Source (/cases/search...)"

echo -e "\n----------------------------------------------------------"
echo "API Tests Completed!"

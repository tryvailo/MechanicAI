#!/bin/bash

# API Testing Script for Car Diagnostics API
# Usage: ./test-api.sh [base_url]
# Example: ./test-api.sh http://localhost:3000

BASE_URL="${1:-http://localhost:3000}"

echo "=========================================="
echo "Car Diagnostics API Test Suite"
echo "Base URL: $BASE_URL"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: /api/analyze-photo
echo -e "${YELLOW}Test 1: POST /api/analyze-photo${NC}"
if [ -f "./public/car-engine.jpg" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/analyze-photo" \
    -F "image=@./public/car-engine.jpg" \
    -F "description=Test diagnosis")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Success (200)${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  else
    echo -e "${RED}✗ Failed ($HTTP_CODE)${NC}"
    echo "$BODY"
  fi
else
  echo -e "${YELLOW}⚠ Skipped: car-engine.jpg not found in ./public/${NC}"
fi
echo ""

# Test 2: /api/transcribe
echo -e "${YELLOW}Test 2: POST /api/transcribe${NC}"
echo -e "${YELLOW}⚠ Note: Requires audio file. Skipping if test-audio.webm not found${NC}"
if [ -f "./test-audio.webm" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/transcribe" \
    -F "audio=@./test-audio.webm")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Success (200)${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  else
    echo -e "${RED}✗ Failed ($HTTP_CODE)${NC}"
    echo "$BODY"
  fi
else
  echo -e "${YELLOW}⚠ Skipped: test-audio.webm not found${NC}"
fi
echo ""

# Test 3: /api/chat (non-streaming)
echo -e "${YELLOW}Test 3: POST /api/chat (non-streaming)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Hello, I need help with my car"
      }
    ]
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✓ Success (200)${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo -e "${RED}✗ Failed ($HTTP_CODE)${NC}"
  echo "$BODY"
fi
echo ""

# Test 4: /api/chat (with diagnostic summary)
echo -e "${YELLOW}Test 4: POST /api/chat (with diagnostic summary)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "How do I fix the fuel system issue?"
      }
    ],
    "diagnosticSummary": "Engine trouble detected. Possible fuel system issue with severity: high"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✓ Success (200)${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo -e "${RED}✗ Failed ($HTTP_CODE)${NC}"
  echo "$BODY"
fi
echo ""

# Test 5: Error case - Invalid request
echo -e "${YELLOW}Test 5: POST /api/chat (error case - missing messages)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 400 ]; then
  echo -e "${GREEN}✓ Correctly returned 400${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo -e "${RED}✗ Expected 400, got $HTTP_CODE${NC}"
  echo "$BODY"
fi
echo ""

echo "=========================================="
echo "Test suite completed"
echo "=========================================="


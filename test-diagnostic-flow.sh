#!/bin/bash

# Test script to verify diagnostic flow after photo analysis

echo "=========================================="
echo "Testing Diagnostic Flow After Photo Analysis"
echo "=========================================="
echo ""

BASE_URL="http://localhost:3000"

# Step 1: Analyze photo
echo "Step 1: Analyzing photo..."
ANALYSIS_RESPONSE=$(curl -s -X POST "$BASE_URL/api/analyze-photo" \
  -F "image=@public/car-engine-problem.jpg" \
  -F "description=What warning lights are shown on the dashboard?")

echo "Analysis Response:"
echo "$ANALYSIS_RESPONSE" | jq '.' 2>/dev/null || echo "$ANALYSIS_RESPONSE"
echo ""

# Extract diagnosis from analysis
DIAGNOSIS=$(echo "$ANALYSIS_RESPONSE" | jq -r '.diagnosis' 2>/dev/null || echo "Check engine light detected")
SEVERITY=$(echo "$ANALYSIS_RESPONSE" | jq -r '.severity' 2>/dev/null || echo "high")
CAUSES=$(echo "$ANALYSIS_RESPONSE" | jq -r '.causes | join(", ")' 2>/dev/null || echo "Unknown")
RECOMMENDATIONS=$(echo "$ANALYSIS_RESPONSE" | jq -r '.recommendations | join(", ")' 2>/dev/null || echo "None")
SUMMARY=$(echo "$ANALYSIS_RESPONSE" | jq -r '.summary' 2>/dev/null || echo "$DIAGNOSIS")

# Create diagnostic summary
DIAGNOSTIC_SUMMARY="Photo Analysis Results:
- Diagnosis: $DIAGNOSIS
- Severity: $SEVERITY
- Possible Causes: $CAUSES
- Recommendations: $RECOMMENDATIONS
- Summary: $SUMMARY"

echo "Step 2: Sending diagnostic summary to chat API..."
echo ""

# Step 2: Test chat with diagnostic summary
CHAT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d "{
    \"messages\": [
      {
        \"role\": \"user\",
        \"content\": \"What warning lights do you see on the dashboard?\"
      }
    ],
    \"diagnosticSummary\": $(echo "$DIAGNOSTIC_SUMMARY" | jq -Rs .)
  }")

echo "Chat Response:"
echo "$CHAT_RESPONSE" | jq -r '.reply' 2>/dev/null || echo "$CHAT_RESPONSE" | jq '.' 2>/dev/null || echo "$CHAT_RESPONSE"
echo ""

# Check if response mentions the diagnosis
if echo "$CHAT_RESPONSE" | grep -qi "engine\|fuel\|diagnosis\|warning" 2>/dev/null; then
  echo "✓ Chat response appears to use diagnostic information"
else
  echo "⚠ Chat response may not be using diagnostic information"
fi

echo ""
echo "=========================================="
echo "Test completed"
echo "=========================================="


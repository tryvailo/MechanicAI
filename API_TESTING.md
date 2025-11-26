# API Integration Testing Guide

This guide provides instructions for testing the car diagnostics API routes locally and on Vercel.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Testing /api/analyze-photo](#testing-apianalyze-photo)
3. [Testing /api/transcribe](#testing-apitranscribe)
4. [Testing /api/chat](#testing-apichat)

---

## Environment Variables

### Required for Local Development

Create a `.env.local` file in the project root:

```env
# OpenAI API Key (required for all endpoints)
OPENAI_API_KEY=sk-proj-your-key-here

# Optional: Anthropic/Claude API Key (alternative for analyze-photo and chat)
CLAUDE_API_KEY=sk-ant-api03-your-key-here

# Optional: Specify which API provider to use
VISION_API_PROVIDER=openai  # or 'claude'
CHAT_API_PROVIDER=openai     # or 'claude'

# Optional: Model overrides
OPENAI_MODEL=gpt-4o
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

### Required for Vercel Deployment

Add these environment variables in Vercel Dashboard:
1. Go to your project → Settings → Environment Variables
2. Add each variable for Production, Preview, and Development environments

**Minimum Required:**
- `OPENAI_API_KEY` (required for all endpoints)

**Optional:**
- `CLAUDE_API_KEY` (alternative provider)
- `VISION_API_PROVIDER` (default: 'openai')
- `CHAT_API_PROVIDER` (default: 'openai')
- `OPENAI_MODEL` (default: 'gpt-4o')
- `CLAUDE_MODEL` (default: 'claude-3-5-sonnet-20241022')

---

## Testing /api/analyze-photo

### Endpoint
```
POST http://localhost:3000/api/analyze-photo
```

### Request Format
- **Content-Type:** `multipart/form-data`
- **Body:** Form data with:
  - `image` (File): JPEG or PNG image, max 5MB
  - `description` (String, optional): Text description of the issue

### Testing with cURL

#### Success Case
```bash
curl -X POST http://localhost:3000/api/analyze-photo \
  -F "image=@/path/to/your/car-image.jpg" \
  -F "description=Engine making strange noise"
```

#### With Optional Description
```bash
curl -X POST http://localhost:3000/api/analyze-photo \
  -F "image=@/path/to/your/car-image.jpg" \
  -F "description=Check engine light is on, car won't start"
```

### Testing with Postman

1. **Method:** POST
2. **URL:** `http://localhost:3000/api/analyze-photo`
3. **Body:** Select `form-data`
4. **Add fields:**
   - Key: `image`, Type: `File`, Value: Select your image file
   - Key: `description`, Type: `Text`, Value: `Engine trouble` (optional)

### Expected Responses

#### Success Response (200)
```json
{
  "diagnosis": "Engine trouble detected. Possible fuel system issue.",
  "severity": "high",
  "causes": [
    "Fuel leak in the system",
    "Faulty fuel injector",
    "Clogged fuel filter"
  ],
  "recommendations": [
    "Immediate diagnostic and repair required",
    "Check fuel pressure",
    "Inspect fuel lines for leaks"
  ],
  "summary": "Analysis indicates a high-severity fuel system problem requiring immediate attention."
}
```

#### Error Responses

**400 - Missing File**
```json
{
  "error": "Audio file required"
}
```

**400 - Invalid File Type**
```json
{
  "error": "Invalid file format"
}
```

**413 - File Too Large**
```json
{
  "error": "File too large"
}
```

**503 - API Error**
```json
{
  "error": "Vision API error: Invalid API key"
}
```

---

## Testing /api/transcribe

### Endpoint
```
POST http://localhost:3000/api/transcribe
```

### Request Format
- **Content-Type:** `multipart/form-data`
- **Body:** Form data with:
  - `audio` (File): WebM, MP3, or WAV audio file, max 20MB

### Testing with cURL

#### Success Case
```bash
curl -X POST http://localhost:3000/api/transcribe \
  -F "audio=@/path/to/your/audio.webm"
```

#### With MP3 File
```bash
curl -X POST http://localhost:3000/api/transcribe \
  -F "audio=@/path/to/your/recording.mp3"
```

### Testing with Postman

1. **Method:** POST
2. **URL:** `http://localhost:3000/api/transcribe`
3. **Body:** Select `form-data`
4. **Add field:**
   - Key: `audio`, Type: `File`, Value: Select your audio file

### Expected Responses

#### Success Response (200)
```json
{
  "text": "What is wrong with my car engine?"
}
```

#### Error Responses

**400 - Missing File**
```json
{
  "error": "Audio file required"
}
```

**415 - Invalid File Format**
```json
{
  "error": "Invalid file format"
}
```

**413 - File Too Large**
```json
{
  "error": "File too large"
}
```

**503 - API Error**
```json
{
  "error": "Transcription failed: Invalid API key"
}
```

---

## Testing /api/chat

### Endpoint
```
POST http://localhost:3000/api/chat
```

### Request Format
- **Content-Type:** `application/json`
- **Body:** JSON with:
  - `messages` (Array): Array of message objects with `role` and `content`
  - `diagnosticSummary` (String, optional): Previous diagnostic analysis
  - `stream` (Boolean, optional): Enable streaming response (default: false)

### Testing with cURL

#### Success Case (Non-Streaming)
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "What is wrong with my car engine?"
      }
    ]
  }'
```

#### With Diagnostic Summary
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "How do I fix the fuel system issue?"
      }
    ],
    "diagnosticSummary": "Engine trouble detected. Possible fuel system issue with severity: high"
  }'
```

#### With Conversation History
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "My car won't start"
      },
      {
        "role": "assistant",
        "content": "I can help you diagnose the issue. Can you tell me more about what happens when you try to start the car?"
      },
      {
        "role": "user",
        "content": "It makes a clicking sound"
      }
    ]
  }'
```

#### Streaming Response
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Explain how to check fuel pressure"
      }
    ],
    "stream": true
  }' \
  --no-buffer
```

### Testing with Postman

1. **Method:** POST
2. **URL:** `http://localhost:3000/api/chat`
3. **Headers:**
   - `Content-Type: application/json`
4. **Body:** Select `raw` → `JSON`, then paste:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "What is wrong with my car engine?"
    }
  ],
  "diagnosticSummary": "Optional: Previous diagnostic context"
}
```

### Expected Responses

#### Success Response (200) - Non-Streaming
```json
{
  "reply": "Based on your description, this could be related to the fuel system. I recommend checking the fuel pressure and inspecting the fuel lines for any leaks. Would you like me to help you troubleshoot further?"
}
```

#### Success Response - Streaming (SSE)
When `stream: true`, the response is Server-Sent Events (SSE):
```
data: {"chunk":"Based on your "}

data: {"chunk":"description, this "}

data: {"chunk":"could be related "}

data: {"chunk":"to the fuel system."}

data: [DONE]
```

#### Error Responses

**400 - Invalid Request**
```json
{
  "error": "Messages array is required"
}
```

**400 - Invalid Message Role**
```json
{
  "error": "Invalid message role"
}
```

**503 - API Error**
```json
{
  "error": "API key not configured"
}
```

**503 - API Service Error**
```json
{
  "error": "Invalid API key"
}
```

---

## Quick Test Script

Create a test script to verify all endpoints:

### test-api.sh
```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "Testing /api/analyze-photo..."
curl -X POST "$BASE_URL/api/analyze-photo" \
  -F "image=@./public/car-engine.jpg" \
  -F "description=Test diagnosis" \
  -w "\nStatus: %{http_code}\n\n"

echo "Testing /api/transcribe..."
curl -X POST "$BASE_URL/api/transcribe" \
  -F "audio=@./test-audio.webm" \
  -w "\nStatus: %{http_code}\n\n"

echo "Testing /api/chat..."
curl -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello, I need help with my car"}
    ]
  }' \
  -w "\nStatus: %{http_code}\n\n"
```

Make it executable:
```bash
chmod +x test-api.sh
./test-api.sh
```

---

## Common Issues and Solutions

### Issue: "API key not configured"
**Solution:** Ensure `.env.local` exists with `OPENAI_API_KEY` set, then restart the dev server.

### Issue: "Invalid file format" (415)
**Solution:** Check file extension and MIME type. For analyze-photo: only JPEG/PNG. For transcribe: only WebM/MP3/WAV.

### Issue: "File too large" (413)
**Solution:** 
- analyze-photo: Max 5MB
- transcribe: Max 20MB

### Issue: CORS errors
**Solution:** This shouldn't happen with Next.js API routes, but if testing from a different origin, ensure the request is from the same domain or configure CORS headers.

### Issue: Streaming not working
**Solution:** Ensure `stream: true` is set in the request body, and use a tool that supports SSE (not all HTTP clients handle streaming well).

---

## Testing on Vercel

After deploying to Vercel:

1. Replace `http://localhost:3000` with your Vercel URL
2. Ensure all environment variables are set in Vercel Dashboard
3. Use the same curl/Postman examples with the production URL

Example:
```bash
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Test"}]}'
```

---

## Response Status Codes Summary

| Status | Meaning | Endpoints |
|--------|---------|-----------|
| 200 | Success | All |
| 400 | Bad Request (missing/invalid data) | All |
| 405 | Method Not Allowed (use POST) | All |
| 413 | Payload Too Large | analyze-photo, transcribe |
| 415 | Unsupported Media Type | analyze-photo, transcribe |
| 500 | Internal Server Error | All |
| 503 | Service Unavailable (API error) | All |


# MechanicAI — System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Next.js PWA)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Splash    │  │   Camera    │  │    Chat     │  │      Places         │ │
│  │   Screen    │──▶   Scanner   │  │  Interface  │  │      Screen         │ │
│  └─────────────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│                          │                │                     │           │
│                          ▼                ▼                     ▼           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        Tab Navigation                                 │  │
│  │    [Camera] [Results] [Chat] [History] [Places]                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MIDDLEWARE LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Rate Limiter                                │    │
│  │  • Fingerprint-based identification                                 │    │
│  │  • Tier-based limits (anonymous/free/pro/business)                  │    │
│  │  • Abuse detection & blocking                                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER (Next.js API Routes)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  /api/chat      │  │ /api/analyze-   │  │  /api/transcribe-gemini    │  │
│  │  (Streaming)    │  │     photo       │  │  /api/transcribe (fallback)│  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────┬───────────────┘  │
│           │                    │                         │                  │
│  ┌────────┴────────┐  ┌────────┴────────┐  ┌─────────────┴───────────────┐  │
│  │ /api/tire-      │  │  /api/vin-ocr   │  │  /api/maintenance-schedule  │  │
│  │    analysis     │  │                 │  │                             │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────┬───────────────┘  │
│           │                    │                         │                  │
│  ┌────────┴─────────────────────────────────────────────┴───────────────┐   │
│  │                    /api/nearby-places                                │   │
│  │                    /api/directions                                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SERVICES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   Google AI     │  │    OpenAI       │  │     Google Maps             │  │
│  │   (Gemini)      │  │   (Whisper)     │  │     Platform                │  │
│  │                 │  │                 │  │                             │  │
│  │  • Vision API   │  │  • Audio        │  │  • Places API               │  │
│  │  • Chat/LLM     │  │    Transcription│  │  • Directions API           │  │
│  │  • Transcribe   │  │    (fallback)   │  │  • Geocoding                │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              COMPONENTS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Page Components:                                                           │
│  ├── splash-screen.tsx      → App entry animation                          │
│  ├── results-page.tsx       → Main container with tab routing              │
│  │                                                                          │
│  Feature Components:                                                        │
│  ├── camera-scanner.tsx     → Photo capture & VIN scanning                 │
│  ├── chat-interface.tsx     → AI chat with voice input                     │
│  ├── analysis-results.tsx   → Photo/tire analysis display                  │
│  ├── history-screen.tsx     → Saved diagnostics history                    │
│  ├── places-screen.tsx      → Nearby mechanics & services                  │
│  ├── nearby-places-map.tsx  → Map with service locations                   │
│  ├── maintenance-schedule.tsx → Vehicle maintenance tracker                │
│  │                                                                          │
│  UI Components:                                                             │
│  ├── tab-navigation.tsx     → Bottom navigation bar                        │
│  ├── error-display.tsx      → Error handling UI                            │
│  ├── video-embed.tsx        → Video player component                       │
│  └── ui/                    → Shadcn UI components                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## API Endpoints

| Endpoint | Method | Purpose | External Service |
|----------|--------|---------|------------------|
| `/api/chat` | POST | AI chat with streaming | Google Gemini |
| `/api/analyze-photo` | POST | Car damage/issue analysis | Google Gemini Vision |
| `/api/tire-analysis` | POST | Tire condition analysis | Google Gemini Vision |
| `/api/vin-ocr` | POST | VIN code extraction | Google Gemini Vision |
| `/api/transcribe-gemini` | POST | Voice transcription (primary) | Google Gemini |
| `/api/transcribe` | POST | Voice transcription (fallback) | OpenAI Whisper |
| `/api/nearby-places` | GET | Find nearby mechanics | Google Places |
| `/api/directions` | GET | Route to service location | Google Directions |
| `/api/maintenance-schedule` | POST | Generate maintenance plan | Google Gemini |

## Data Flow

### Photo Analysis Flow
```
User captures photo
        │
        ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ CameraScanner │────▶│ /api/analyze- │────▶│ Gemini Vision │
│  Component    │     │     photo     │     │      API      │
└───────────────┘     └───────────────┘     └───────────────┘
        │                                           │
        ▼                                           ▼
┌───────────────┐                          ┌───────────────┐
│ AnalysisResults│◀────────────────────────│  AI Analysis  │
│   Component   │                          │    Result     │
└───────────────┘                          └───────────────┘
```

### Voice Chat Flow
```
User taps microphone
        │
        ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ ChatInterface │────▶│/api/transcribe│────▶│ Gemini/Whisper│
│  Component    │     │    -gemini    │     │      API      │
└───────────────┘     └───────────────┘     └───────────────┘
        │                                           │
        ▼                                           ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Transcribed  │────▶│   /api/chat   │────▶│ Gemini LLM    │
│     Text      │     │  (streaming)  │     │               │
└───────────────┘     └───────────────┘     └───────────────┘
        │                                           │
        ▼                                           ▼
┌───────────────────────────────────────────────────────────┐
│              AI Response (Streamed to UI)                 │
└───────────────────────────────────────────────────────────┘
```

## Rate Limiting Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Rate Limit System                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐   ┌─────────────────┐   ┌───────────────┐  │
│  │   Fingerprint   │──▶│  Abuse Detector │──▶│   Limiter     │  │
│  │   Extractor     │   │  (Burst/Flood)  │   │               │  │
│  └─────────────────┘   └─────────────────┘   └───────────────┘  │
│          │                                           │          │
│          ▼                                           ▼          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    In-Memory Store                      │    │
│  │  • Rate limit counters per identifier                   │    │
│  │  • Blocked IP tracking                                  │    │
│  │  • Request history for abuse detection                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Limits per day (anonymous):                                    │
│  • Chat: 50 requests                                            │
│  • Image scan: 20 requests                                      │
│  • Audio scan: 20 requests                                      │
│  • Video scan: 5 requests                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | Shadcn UI + Radix |
| State | React useState/useCallback |
| Deployment | Vercel |
| AI/ML | Google Gemini, OpenAI Whisper |
| Maps | Google Maps Platform |

## File Structure

```
camera-scanning-screen/
├── app/
│   ├── api/                    # API routes
│   │   ├── chat/              # AI chat endpoint
│   │   ├── analyze-photo/     # Photo analysis
│   │   ├── tire-analysis/     # Tire condition
│   │   ├── vin-ocr/           # VIN extraction
│   │   ├── transcribe/        # OpenAI Whisper
│   │   ├── transcribe-gemini/ # Gemini transcription
│   │   ├── nearby-places/     # Google Places
│   │   ├── directions/        # Google Directions
│   │   └── maintenance-schedule/
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Entry point
│   └── globals.css            # Global styles
├── components/                 # React components
├── config/                     # App configuration
├── lib/
│   ├── rate-limit/            # Rate limiting system
│   ├── hooks/                 # Custom React hooks
│   └── utils/                 # Utility functions
├── public/                     # Static assets
└── types/                      # TypeScript definitions
```

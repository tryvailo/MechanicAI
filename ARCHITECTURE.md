# Архитектура проекта MechanicAI

AI-powered приложение для диагностики автомобилей с использованием камеры, чата и карты ближайших сервисов.

## Общая структура

```mermaid
graph TB
    subgraph Client["Frontend (Next.js App Router)"]
        Page["app/page.tsx"]
        Layout["app/layout.tsx"]
        
        subgraph Screens["Экраны приложения"]
            Results["ResultsPage"]
            Camera["CameraScanner"]
            Chat["ChatInterface"]
            History["HistoryScreen"]
            Places["PlacesScreen"]
            Analysis["AnalysisResults"]
        end
        
        subgraph UI["UI Components"]
            TabNav["TabNavigation"]
            Map["NearbyPlacesMap"]
            UILib["ui/ (shadcn)"]
        end
    end
    
    subgraph API["API Routes (Server)"]
        AnalyzeAPI["/api/analyze-photo"]
        ChatAPI["/api/chat"]
        PlacesAPI["/api/nearby-places"]
        TranscribeAPI["/api/transcribe"]
    end
    
    subgraph External["External Services"]
        OpenAI["OpenAI API"]
        Claude["Claude API"]
        GooglePlaces["Google Places API"]
        GoogleMaps["Google Maps JS API"]
    end
    
    Page --> Results
    Results --> Camera
    Results --> Chat
    Results --> History
    Results --> Places
    Results --> Analysis
    Results --> TabNav
    
    Places --> Map
    Map --> GoogleMaps
    
    Camera --> AnalyzeAPI
    Chat --> ChatAPI
    Places --> PlacesAPI
    Camera --> TranscribeAPI
    
    AnalyzeAPI --> OpenAI
    AnalyzeAPI --> Claude
    ChatAPI --> OpenAI
    ChatAPI --> Claude
    PlacesAPI --> GooglePlaces
    TranscribeAPI --> OpenAI
```

## Навигация и экраны

```mermaid
flowchart LR
    subgraph Navigation["Tab Navigation"]
        direction TB
        T1["📷 Camera"]
        T2["📊 Results"]
        T3["💬 Chat"]
        T4["📜 History"]
        T5["📍 Places"]
    end
    
    T1 --> CS["CameraScanner\n- Фото/видео съёмка\n- Голосовой ввод\n- Анализ изображений"]
    T2 --> AR["AnalysisResults\n- Результаты диагностики\n- Список проблем\n- Рекомендации"]
    T3 --> CI["ChatInterface\n- AI чат-бот\n- Streaming ответы\n- Markdown рендеринг"]
    T4 --> HS["HistoryScreen\n- История сканирований\n- LocalStorage"]
    T5 --> PS["PlacesScreen\n- Nearby Places Map\n- Автосервисы\n- Парковки"]
```

## Поток данных анализа фото

```mermaid
sequenceDiagram
    participant U as User
    participant CS as CameraScanner
    participant API as /api/analyze-photo
    participant AI as OpenAI/Claude
    participant AR as AnalysisResults
    
    U->>CS: Делает фото
    CS->>CS: Конвертация в base64
    CS->>API: POST {image, prompt}
    API->>API: Выбор провайдера (env)
    API->>AI: Vision API запрос
    AI-->>API: Анализ изображения
    API-->>CS: JSON результат
    CS->>CS: Сохранение в localStorage
    CS->>AR: Переход на Results
    AR->>AR: Отображение диагностики
```

## Поток чата

```mermaid
sequenceDiagram
    participant U as User
    participant CI as ChatInterface
    participant API as /api/chat
    participant AI as OpenAI/Claude
    
    U->>CI: Вводит вопрос
    CI->>CI: Добавляет в messages[]
    CI->>API: POST {messages, context}
    API->>API: Формирует system prompt
    API->>AI: Chat Completion (stream)
    
    loop Streaming
        AI-->>API: chunk
        API-->>CI: SSE chunk
        CI->>CI: Обновление UI
    end
    
    CI->>CI: Финальное сообщение
```

## Поток Places (карта)

```mermaid
sequenceDiagram
    participant U as User
    participant PS as PlacesScreen
    participant Geo as useGeolocation
    participant API as /api/nearby-places
    participant GP as Google Places API
    participant Map as NearbyPlacesMap
    participant GM as Google Maps JS
    
    U->>PS: Открывает вкладку Places
    PS->>Geo: Запрос геолокации
    Geo-->>PS: {lat, lng}
    
    PS->>API: POST {lat, lng, radius, types}
    API->>GP: searchNearby()
    GP-->>API: places[]
    API-->>PS: {carRepairs, parkings}
    
    PS->>Map: Передача данных
    Map->>GM: Загрузка скрипта
    GM-->>Map: API ready
    Map->>Map: Создание карты
    Map->>Map: Добавление маркеров
    
    U->>Map: Клик на маркер
    Map->>Map: InfoWindow с деталями
```

## Структура файлов

```
camera-scanning-screen/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (серверные)
│   │   ├── analyze-photo/        # Анализ фото через Vision AI
│   │   ├── chat/                 # AI чат
│   │   ├── nearby-places/        # Google Places API
│   │   └── transcribe/           # Транскрипция аудио
│   ├── layout.tsx                # Root layout + metadata
│   └── page.tsx                  # Главная страница
│
├── components/                   # React компоненты
│   ├── ui/                       # shadcn/ui компоненты
│   ├── results-page.tsx          # Главный контейнер с табами
│   ├── camera-scanner.tsx        # Камера + анализ
│   ├── chat-interface.tsx        # AI чат
│   ├── history-screen.tsx        # История
│   ├── places-screen.tsx         # Nearby Places
│   ├── nearby-places-map.tsx     # Google Maps
│   └── tab-navigation.tsx        # Нижняя навигация
│
├── lib/                          # Утилиты и конфигурация
│   ├── config/places.ts          # Конфиг Google Places
│   ├── hooks/useGeolocation.ts   # Хук геолокации
│   └── utils/                    # Вспомогательные функции
│
└── public/                       # Статические файлы
    └── markers/                  # SVG маркеры для карты
```

## Стек технологий

| Слой | Технологии |
|------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **UI** | Tailwind CSS 4, shadcn/ui, Radix UI |
| **Maps** | Google Maps JavaScript API, Google Places API (New) |
| **AI** | OpenAI GPT-4o (Vision + Chat), Claude (опционально) |
| **State** | React hooks, localStorage |
| **Deploy** | Vercel |

## Переменные окружения

```bash
# AI Providers
OPENAI_API_KEY=sk-...
CLAUDE_API_KEY=sk-ant-...
VISION_API_PROVIDER=openai    # openai | claude
CHAT_API_PROVIDER=openai      # openai | claude

# Google APIs
GOOGLE_PLACES_API_KEY=...              # Server-side (Places API)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...    # Client-side (Maps JS API)
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=...     # Map styling ID
```

## Ключевые особенности

1. **Lazy Loading** — PlacesScreen загружается только при первом посещении вкладки
2. **Streaming** — Ответы чата приходят в режиме реального времени
3. **Offline-first** — История сохраняется в localStorage
4. **Responsive** — Адаптивный дизайн для мобильных устройств
5. **PWA-ready** — Поддержка viewport-fit для iPhone notch

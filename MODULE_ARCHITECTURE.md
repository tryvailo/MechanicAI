# Архитектура модуля распознавания ошибок приборной панели

## Общая структура

```
┌─────────────────────────────────────────────────────────────────┐
│                    DASHBOARD ERROR MODULE                        │
│                     (Platform-agnostic)                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
            ┌───────▼────────┐      ┌──────▼────────┐
            │  @dashboard-   │      │  @dashboard-  │
            │  module/core   │      │  module/react │
            │  (Framework-   │      │  (React       │
            │   agnostic)    │      │   bindings)   │
            └───────┬────────┘      └───────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
  ┌─────▼─────┐ ┌──▼────┐ ┌────▼────┐
  │ @dashboard│ │ @dash-│ │ @dash-  │
  │ -module/  │ │ board-│ │ board-  │
  │ server    │ │ module│ │ module/ │
  │ (Node.js) │ │ /cli  │ │ native  │
  └───────────┘ └───────┘ └─────────┘
```

## Core модуль (@dashboard-module/core)

```
@dashboard-module/core
├── Analyzers
│   ├── DashboardAnalyzer      # Главный класс анализатора
│   ├── ImagePreprocessor      # Предобработка изображений
│   └── ResultNormalizer       # Нормализация результатов
│
├── Providers (AI)
│   ├── BaseAIProvider         # Абстрактный класс
│   ├── OpenAIProvider         # GPT-4o Vision
│   ├── ClaudeProvider         # Claude 3.5 Sonnet
│   ├── GeminiProvider         # Gemini 2.0 (WebSocket)
│   └── LocalProvider          # Ollama/llama.cpp (future)
│
├── Knowledge Base
│   ├── IndicatorDatabase      # База данных индикаторов
│   ├── ManufacturerRules      # Специфика производителей
│   ├── EUStandards            # Европейские стандарты
│   └── OBDMapping             # Mapping на OBD-II коды
│
├── Parsers
│   ├── ResponseParser         # Парсинг AI ответов
│   ├── JSONExtractor          # Извлечение JSON
│   └── TextAnalyzer           # Fallback текстовый анализ
│
├── Localization
│   ├── LocaleManager          # Управление локалями
│   └── Translations           # Переводы (EN, DE, FR, IT, ES...)
│
└── Utils
    ├── Cache                  # Кэширование результатов
    ├── RateLimiter            # Ограничение запросов
    ├── Metrics                # Метрики (latency, accuracy)
    └── Logger                 # Логирование
```

## Поток данных - Статичный анализ

```
┌─────────────┐
│   Image     │
│  (File/URL/ │
│   base64)   │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ ImagePreprocessor│
│ • Resize         │
│ • Validate       │
│ • Optimize       │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│  Provider Selector   │
│  • Primary: OpenAI   │
│  • Fallback: Claude  │
└────────┬─────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│         AI Vision API               │
│  ┌─────────────────────────────┐   │
│  │  System Prompt              │   │
│  │  • Dashboard indicators KB  │   │
│  │  • EU standards             │   │
│  │  • Manufacturer specifics   │   │
│  │  • OBD-II mapping           │   │
│  └─────────────────────────────┘   │
│              ▼                      │
│  ┌─────────────────────────────┐   │
│  │  Image + User prompt        │   │
│  └─────────────────────────────┘   │
└────────┬────────────────────────────┘
         │
         ▼
┌──────────────────────┐
│   Response Parser    │
│  • JSON extraction   │
│  • Validation        │
│  • Normalization     │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Knowledge Base Enrichment   │
│  • Match indicators          │
│  • Add EU compliance info    │
│  • Map to OBD-II codes       │
│  • Localize descriptions     │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────┐
│   Analysis Result    │
│  • Indicators[]      │
│  • Diagnosis         │
│  • Severity          │
│  • Recommendations   │
│  • Cost estimate     │
└──────────────────────┘
```

## Поток данных - Real-time режим

```
┌─────────────┐
│  Video      │
│  Stream +   │
│  Audio      │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Frame Extractor  │
│ • 1 frame/sec    │
│ • Resize to 640px│
│ • JPEG compress  │
└────────┬─────────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌────────────────┐   ┌──────────────┐
│ Audio Processor│   │ Video Frame  │
│ • PCM 16-bit   │   │ • Base64     │
│ • 16kHz        │   │              │
└────────┬───────┘   └──────┬───────┘
         │                  │
         └────────┬─────────┘
                  │
                  ▼
      ┌───────────────────────┐
      │   WebSocket (Gemini)  │
      │   • Bidirectional     │
      │   • Low latency       │
      └───────────┬───────────┘
                  │
                  ▼
      ┌───────────────────────┐
      │   AI Processing       │
      │   • Vision analysis   │
      │   • Speech recognition│
      │   • Language detection│
      └───────────┬───────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌───────────────┐   ┌──────────────┐
│ Text Response │   │ Audio Stream │
│ (indicators)  │   │ (TTS)        │
└───────────────┘   └──────────────┘
```

## Интеграция в различные платформы

### Next.js / React

```typescript
import { DashboardAnalyzer } from '@dashboard-module/core';
import { useDashboardAnalyzer } from '@dashboard-module/react';

function App() {
  const { analyze, result, loading } = useDashboardAnalyzer({
    provider: 'openai',
    locale: 'de-DE',
    market: 'europe'
  });

  const handleImageUpload = async (file: File) => {
    const result = await analyze({ image: file });
    console.log(result.indicators);
  };

  return <DashboardScanner onAnalyze={handleImageUpload} />;
}
```

### Node.js / Express

```typescript
import { DashboardAnalyzer } from '@dashboard-module/core';

const analyzer = new DashboardAnalyzer({
  providers: {
    primary: 'openai',
    fallback: ['claude']
  },
  config: {
    openai: { apiKey: process.env.OPENAI_API_KEY }
  }
});

app.post('/api/analyze', async (req, res) => {
  const result = await analyzer.analyzeImage({
    image: req.file.buffer,
    locale: req.headers['accept-language']
  });

  res.json(result);
});
```

### Standalone Server

```bash
# Docker запуск
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=xxx \
  -e CLAUDE_API_KEY=xxx \
  dashboard-module/server

# HTTP запрос
curl -X POST http://localhost:3000/api/analyze \
  -F "image=@dashboard.jpg" \
  -F "locale=de-DE"
```

### CLI

```bash
# Установка
npm install -g @dashboard-module/cli

# Конфигурация
dashboard-analyzer config set provider openai
dashboard-analyzer config set apiKey sk-xxx

# Анализ
dashboard-analyzer analyze ./my-dashboard.jpg

# Результат
⚠️  3 indicators detected:
🔴 CRITICAL: Oil Pressure Low
   ├─ Action: STOP immediately, check oil level
   ├─ Causes: Low oil, pump failure, leak
   └─ OBD-II: P0520, P0521, P0522

🟡 WARNING: Check Engine Light
   ├─ Action: Schedule diagnostic scan
   └─ OBD-II: Multiple possible codes

🟢 INFO: Low Beam On
   └─ Normal operation
```

## Европейская специфика

### База знаний по странам

```typescript
interface EUCountryStandards {
  country: string;
  inspectionName: string;           // TÜV, MOT, ITV, etc.
  inspectionInterval: number;        // месяцы
  criticalIndicators: string[];     // Автоматический провал
  warningIndicators: string[];      // Требует проверки
  legalRequirements: {
    firstAidKit: boolean;
    warningTriangle: boolean;
    reflectiveVest: boolean;
  };
}

const germanyStandards: EUCountryStandards = {
  country: 'DE',
  inspectionName: 'Hauptuntersuchung (HU)',
  inspectionInterval: 24,
  criticalIndicators: [
    'airbag_warning',
    'abs_warning',
    'brake_warning',
    'oil_pressure'
  ],
  warningIndicators: [
    'check_engine',
    'tire_pressure',
    'esp_warning'
  ],
  legalRequirements: {
    firstAidKit: true,
    warningTriangle: true,
    reflectiveVest: true
  }
};
```

### OBD-II интеграция

```typescript
interface OBDMapping {
  indicatorId: string;
  dtcCodes: string[];              // Diagnostic Trouble Codes
  description: string;
  severity: 'critical' | 'warning';
  euroCompliance: string;          // EU regulation reference
}

const mappings: OBDMapping[] = [
  {
    indicatorId: 'check_engine',
    dtcCodes: ['P0420', 'P0430', 'P0171', 'P0300-P0308'],
    description: 'Emission system fault',
    severity: 'warning',
    euroCompliance: 'EU 2009/40/EC Annex I'
  },
  {
    indicatorId: 'airbag_warning',
    dtcCodes: ['B0001-B0099', 'C0001-C0099'],
    description: 'Airbag/SRS malfunction',
    severity: 'critical',
    euroCompliance: 'ECE R94 (Frontal Impact)'
  }
];
```

### Мультиязычность

```typescript
// Локализация индикатора
interface LocalizedIndicator {
  id: string;
  symbol: string;
  translations: {
    en: { name: string; description: string; action: string };
    de: { name: string; description: string; action: string };
    fr: { name: string; description: string; action: string };
    it: { name: string; description: string; action: string };
    es: { name: string; description: string; action: string };
    pl: { name: string; description: string; action: string };
    nl: { name: string; description: string; action: string };
  };
}

const oilPressure: LocalizedIndicator = {
  id: 'oil_pressure',
  symbol: 'oil_can',
  translations: {
    en: {
      name: 'Oil Pressure Warning',
      description: 'Low engine oil pressure detected',
      action: 'STOP immediately and check oil level'
    },
    de: {
      name: 'Öldruckwarnung',
      description: 'Niedriger Motoröldruck erkannt',
      action: 'SOFORT anhalten und Ölstand prüfen'
    },
    fr: {
      name: 'Pression d\'huile',
      description: 'Pression d\'huile moteur faible détectée',
      action: 'ARRÊTEZ immédiatement et vérifiez le niveau d\'huile'
    }
    // ... другие языки
  }
};
```

## Производительность и масштабирование

### Кэширование

```
┌─────────────────────────────────────┐
│         Client Request              │
└────────────┬────────────────────────┘
             │
             ▼
      ┌─────────────┐
      │ Image Hash  │  ← SHA-256 хеш изображения
      └──────┬──────┘
             │
        ┌────▼────┐
        │ Cache?  │
        └─┬────┬──┘
     YES  │    │ NO
          │    │
          ▼    ▼
    ┌─────────────┐      ┌────────────┐
    │ Return      │      │ Call AI    │
    │ Cached      │      │ Provider   │
    │ Result      │      └─────┬──────┘
    └─────────────┘            │
                               ▼
                        ┌──────────────┐
                        │ Store in     │
                        │ Cache (15min)│
                        └──────────────┘
```

### Rate Limiting

```typescript
// По API ключу
const rateLimits = {
  free: {
    requestsPerMinute: 5,
    requestsPerDay: 100
  },
  pro: {
    requestsPerMinute: 30,
    requestsPerDay: 5000
  },
  business: {
    requestsPerMinute: 100,
    requestsPerDay: 50000
  }
};
```

### Масштабирование сервера

```
┌─────────────────────────────────────────────────────┐
│                 Load Balancer                       │
│                 (nginx/HAProxy)                     │
└──────────┬─────────────┬─────────────┬──────────────┘
           │             │             │
           ▼             ▼             ▼
    ┌───────────┐ ┌───────────┐ ┌───────────┐
    │  Server   │ │  Server   │ │  Server   │
    │  Node 1   │ │  Node 2   │ │  Node 3   │
    └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
          │             │             │
          └─────────────┼─────────────┘
                        │
                        ▼
                ┌───────────────┐
                │  Redis Cache  │
                │  (shared)     │
                └───────────────┘
                        │
                        ▼
                ┌───────────────┐
                │  PostgreSQL   │
                │  (metrics,    │
                │   analytics)  │
                └───────────────┘
```

## Метрики и мониторинг

### Prometheus метрики

```typescript
// Экспортируемые метрики
- dashboard_analyzer_requests_total          # Общее количество запросов
- dashboard_analyzer_requests_duration_ms    # Latency
- dashboard_analyzer_errors_total            # Ошибки
- dashboard_analyzer_provider_calls_total    # Вызовы по провайдерам
- dashboard_analyzer_cache_hits_total        # Cache hits
- dashboard_analyzer_indicators_detected     # Количество обнаруженных индикаторов
- dashboard_analyzer_cost_estimate_usd       # Стоимость AI API
```

### Grafana дашборды

```
┌─────────────────────────────────────────────────────┐
│  Dashboard Analyzer - Monitoring                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Requests/min: ████████████░░░░ 1,234              │
│  Avg Latency:  ████████░░░░░░░░ 1.2s               │
│  Error Rate:   ██░░░░░░░░░░░░░░ 0.5%               │
│  Cache Hit %:  ████████████████ 78%                │
│                                                     │
│  Provider Distribution:                             │
│  • OpenAI:  65% ████████████████░░░░               │
│  • Claude:  30% ███████████░░░░░░░░                │
│  • Gemini:   5% ███░░░░░░░░░░░░░░░                 │
│                                                     │
│  Top Indicators Detected (24h):                     │
│  1. Check Engine    2,345                          │
│  2. Tire Pressure   1,892                          │
│  3. ABS Warning     1,234                          │
│  4. Oil Pressure      456                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Безопасность

### API Key управление

```typescript
// Шифрование ключей at rest
import { encrypt, decrypt } from 'crypto';

class SecureConfig {
  private masterKey: string;

  storeApiKey(provider: string, apiKey: string) {
    const encrypted = encrypt(apiKey, this.masterKey);
    // Сохранить в БД/файл
  }

  getApiKey(provider: string): string {
    const encrypted = loadFromStorage(provider);
    return decrypt(encrypted, this.masterKey);
  }
}
```

### GDPR Compliance

```typescript
interface DataRetentionPolicy {
  imageStorage: 'none' | 'temporary' | 'permanent';
  imageRetentionDays: number;
  resultRetentionDays: number;
  piiFiltering: boolean;
  rightToErasure: boolean;
  dataExportFormat: 'json' | 'csv';
}

const gdprCompliantPolicy: DataRetentionPolicy = {
  imageStorage: 'temporary',
  imageRetentionDays: 1,          // 24 часа
  resultRetentionDays: 30,        // 30 дней
  piiFiltering: true,             // Фильтруем номера авто
  rightToErasure: true,           // API для удаления
  dataExportFormat: 'json'
};
```

## Тестирование

### Test Coverage структура

```
tests/
├── unit/
│   ├── analyzers/
│   │   ├── dashboard-analyzer.test.ts
│   │   └── image-preprocessor.test.ts
│   ├── providers/
│   │   ├── openai-provider.test.ts
│   │   ├── claude-provider.test.ts
│   │   └── gemini-provider.test.ts
│   ├── parsers/
│   │   └── response-parser.test.ts
│   └── knowledge/
│       └── indicator-database.test.ts
│
├── integration/
│   ├── full-analysis-flow.test.ts
│   ├── provider-fallback.test.ts
│   └── real-images.test.ts
│
├── e2e/
│   ├── api-server.test.ts
│   ├── react-components.test.ts
│   └── cli.test.ts
│
└── fixtures/
    ├── images/
    │   ├── bmw-check-engine.jpg
    │   ├── mercedes-oil-warning.jpg
    │   ├── vw-multiple-warnings.jpg
    │   └── ... (100+ тестовых изображений)
    └── responses/
        ├── openai-responses.json
        └── claude-responses.json
```

---

**Следующий шаг:** Начать разработку Core модуля
**Оценка времени:** 6-8 недель до MVP
**Приоритет:** HIGH

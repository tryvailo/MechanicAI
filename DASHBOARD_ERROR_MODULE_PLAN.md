# План работ: Модуль распознавания ошибок приборной панели

## Дата создания: 2026-01-12
**Целевой рынок:** Европа
**Цель:** Создать независимый модуль для распознавания и обработки ошибок приборной панели автомобиля

---

## 📊 ТЕКУЩЕЕ СОСТОЯНИЕ СИСТЕМЫ

### Архитектура распознавания
Текущая система интегрирована в Next.js приложение MechanicAI и состоит из:

1. **Backend API** (`/app/api/analyze-photo/route.ts`)
   - Vision API интеграция (OpenAI GPT-4o / Claude 3.5 Sonnet)
   - Обработка изображений (JPEG/PNG, макс 5MB)
   - Парсинг и структурирование результатов

2. **База знаний** (`/config/dashboard-indicators.ts`)
   - 248 строк детального описания индикаторов
   - Классификация по цвету (RED/YELLOW/GREEN)
   - Специфика производителей (BMW, Mercedes, VW/Audi, Volvo)
   - Европейские стандарты диагностики

3. **Real-time модуль** (`/hooks/useDashboardMechanic.ts`)
   - WebSocket подключение к Gemini 2.0
   - Live видеопоток анализ
   - Аудио вход/выход для голосового взаимодействия

4. **Frontend компоненты**
   - Сканирование фото (`/app/scan/page.tsx`)
   - Real-time режим (`/app/realtime/page.tsx`)
   - Отображение результатов (`/components/error-display.tsx`)

### Ключевые возможности
- ✅ Распознавание 30+ типов индикаторов приборной панели
- ✅ Анализ повреждений кузова и шин
- ✅ Мультиязычность (авто-определение)
- ✅ Два режима работы (статичное фото / live видео)
- ✅ Fallback между провайдерами AI

### Зависимости
- **Frontend:** React 19, Next.js 16, TypeScript
- **UI:** Radix UI, Tailwind CSS
- **AI API:** OpenAI, Claude (Anthropic), Google Gemini
- **Вспомогательные:** react-markdown, date-fns

---

## 🎯 ЦЕЛИ ПРОЕКТА МОДУЛЯ

### Функциональные требования
1. **Автономность**
   - Модуль не зависит от Next.js или React
   - Работает в Node.js, браузере, React Native
   - Минимум внешних зависимостей

2. **Европейский фокус**
   - Приоритет европейским маркам (VW, BMW, Mercedes, Renault, Peugeot, Volvo, Fiat)
   - Поддержка европейских стандартов (EU регламенты, ECE правила)
   - Мультиязычность (EN, DE, FR, IT, ES, PL, NL, RU)
   - Интеграция с EU OBD-II стандартами

3. **Производительность**
   - Оптимизированные промпты для быстрого ответа
   - Кэширование повторяющихся результатов
   - Batch обработка для множественных изображений

4. **Гибкость интеграции**
   - SDK для различных платформ
   - REST API сервер (опционально)
   - WebSocket real-time поддержка
   - CLI инструмент для тестирования

5. **Безопасность и приватность**
   - Локальная обработка (опционально)
   - GDPR compliance
   - Шифрование данных в transit
   - Опция self-hosted deployment

---

## 📋 ПЛАН РАБОТ

### ФАЗА 1: Архитектура и проектирование (3-5 дней)

#### 1.1 Определение структуры модуля
```
dashboard-error-module/
├── packages/
│   ├── core/                    # Ядро модуля (framework-agnostic)
│   │   ├── src/
│   │   │   ├── analyzers/       # Анализаторы изображений
│   │   │   ├── parsers/         # Парсеры ответов AI
│   │   │   ├── providers/       # AI провайдеры (OpenAI, Claude, Gemini)
│   │   │   ├── knowledge/       # База знаний индикаторов
│   │   │   ├── types/           # TypeScript типы
│   │   │   └── index.ts         # Публичный API
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── react/                   # React интеграция
│   │   ├── src/
│   │   │   ├── hooks/           # useDashboardAnalyzer
│   │   │   ├── components/      # UI компоненты
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── node-server/            # Node.js REST API сервер
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── cli/                    # CLI инструмент
│       ├── src/
│       └── package.json
│
├── docs/                       # Документация
│   ├── getting-started.md
│   ├── api-reference.md
│   ├── european-standards.md
│   └── examples/
│
├── examples/                   # Примеры интеграции
│   ├── nextjs/
│   ├── express/
│   ├── react-native/
│   └── vanilla-js/
│
└── scripts/                    # Build скрипты
```

**Задачи:**
- [ ] Создать monorepo структуру (pnpm workspaces / Turborepo)
- [ ] Определить публичные API интерфейсы
- [ ] Спроектировать систему плагинов для AI провайдеров
- [ ] Определить схему конфигурации модуля

#### 1.2 Спецификация API

**Основной API (TypeScript):**
```typescript
// Инициализация
const analyzer = new DashboardAnalyzer({
  providers: {
    primary: 'openai',
    fallback: ['claude', 'gemini']
  },
  config: {
    openai: { apiKey: 'xxx', model: 'gpt-4o' },
    claude: { apiKey: 'xxx', model: 'claude-3-5-sonnet' }
  },
  locale: 'de-DE',  // Европейская локаль
  market: 'europe'   // Европейский фокус
});

// Анализ статичного изображения
const result = await analyzer.analyzeImage({
  image: Buffer | File | URL | base64,
  mode: 'dashboard' | 'damage' | 'tire' | 'auto',
  includeDetails: true
});

// Результат
interface AnalysisResult {
  type: 'dashboard' | 'damage' | 'tire';

  // Для dashboard
  indicators?: DashboardIndicator[];
  criticalWarnings?: CriticalWarning[];

  // Общие поля
  diagnosis: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  causes: Cause[];
  recommendations: Recommendation[];
  estimatedCost?: CostRange;

  // Метаданные
  confidence: number;
  processingTime: number;
  provider: 'openai' | 'claude' | 'gemini';
}

interface DashboardIndicator {
  id: string;
  symbol: string;
  color: 'red' | 'yellow' | 'green' | 'blue' | 'white';
  state: 'solid' | 'flashing';
  category: 'critical' | 'warning' | 'info';
  name: string;
  nameLocalized: Record<string, string>;
  description: string;
  descriptionLocalized: Record<string, string>;
  action: string;
  actionLocalized: Record<string, string>;
  urgency: 1 | 2 | 3 | 4 | 5;
  relatedIndicators?: string[];
  manufacturerSpecific?: {
    brands: string[];
    notes: string;
  };
  euCompliance?: {
    regulation: string;
    mandatory: boolean;
  };
}

// Real-time streaming
const stream = analyzer.createRealtimeSession({
  mode: 'websocket',
  video: true,
  audio: true
});

stream.on('indicator-detected', (indicator) => {
  console.log('New warning:', indicator);
});

stream.on('critical-warning', (warning) => {
  alert('CRITICAL: ' + warning.message);
});
```

**Задачи:**
- [ ] Определить TypeScript интерфейсы для всех типов данных
- [ ] Разработать систему локализации (i18n)
- [ ] Создать валидацию входных данных (Zod схемы)
- [ ] Спроектировать систему событий для real-time режима

#### 1.3 Европейская адаптация

**База знаний для EU рынка:**
- [ ] Расширить базу индикаторов европейскими стандартами
  - ECE R48 (световые сигнальные устройства)
  - EU 2009/40/EC (технический осмотр)
  - ISO 2575 (символы органов управления и индикаторов)

- [ ] Добавить специфику по странам
  - Германия: TÜV требования, AU/HU нормы
  - Франция: Contrôle Technique правила
  - Италия: Revisione правила
  - UK: MOT стандарты (post-Brexit адаптация)

- [ ] Интеграция с EU OBD-II стандартами
  - Mapping индикаторов на DTC коды
  - EU-специфичные коды (P1xxx-P3xxx)
  - EOBD (European On-Board Diagnostics)

**Задачи:**
- [ ] Собрать базу EU-специфичных индикаторов и правил
- [ ] Создать mapping таблицы (индикатор → DTC код)
- [ ] Добавить проверки на соответствие EU регламентам
- [ ] Интегрировать данные о технических осмотрах по странам

---

### ФАЗА 2: Разработка Core модуля (7-10 дней)

#### 2.1 Создание ядра (`@dashboard-module/core`)

**2.1.1 Провайдеры AI**
```typescript
// Абстракция провайдера
interface AIProvider {
  name: string;
  analyzeImage(params: AnalyzeParams): Promise<RawAnalysis>;
  supportsStreaming: boolean;
  createStream?(params: StreamParams): AsyncIterableIterator<StreamChunk>;
}

// Реализации
class OpenAIProvider implements AIProvider { ... }
class ClaudeProvider implements AIProvider { ... }
class GeminiProvider implements AIProvider { ... }
class LocalVisionProvider implements AIProvider { ... } // Опционально
```

**Задачи:**
- [ ] Реализовать базовый абстрактный класс `BaseAIProvider`
- [ ] Портировать логику `callOpenAIVision()` в `OpenAIProvider`
- [ ] Портировать логику `callClaudeVision()` в `ClaudeProvider`
- [ ] Реализовать `GeminiProvider` с WebSocket поддержкой
- [ ] Добавить retry логику с экспоненциальным backoff
- [ ] Реализовать circuit breaker для отказоустойчивости

**2.1.2 База знаний индикаторов**
```typescript
class IndicatorKnowledgeBase {
  private indicators: Map<string, IndicatorDefinition>;

  getIndicator(id: string): IndicatorDefinition | null;
  searchBySymbol(symbol: string): IndicatorDefinition[];
  filterByColor(color: IndicatorColor): IndicatorDefinition[];
  getByManufacturer(brand: string): IndicatorDefinition[];
  getByCriticality(level: number): IndicatorDefinition[];
}
```

**Задачи:**
- [ ] Извлечь данные из `dashboard-indicators.ts` в структурированный JSON
- [ ] Создать TypeScript типы для индикаторов
- [ ] Реализовать поиск и фильтрацию
- [ ] Добавить версионирование базы знаний
- [ ] Создать механизм обновления базы (remote updates)

**2.1.3 Парсеры результатов**
```typescript
class ResponseParser {
  parse(rawResponse: string, format: 'json' | 'text'): AnalysisResult;
  extractIndicators(response: string): DashboardIndicator[];
  extractDiagnosis(response: string): Diagnosis;
  normalizeResponse(response: unknown): AnalysisResult;
}
```

**Задачи:**
- [ ] Портировать `parseAnalysisResponse()` функцию
- [ ] Улучшить парсинг JSON с fallback логикой
- [ ] Добавить валидацию результатов (Zod)
- [ ] Реализовать нормализацию данных от разных провайдеров
- [ ] Добавить обработку частичных/неполных ответов

**2.1.4 Анализаторы**
```typescript
class DashboardAnalyzer {
  constructor(config: AnalyzerConfig);

  async analyzeImage(params: AnalyzeImageParams): Promise<AnalysisResult>;
  async analyzeBatch(images: ImageInput[]): Promise<AnalysisResult[]>;

  createRealtimeSession(params: SessionParams): RealtimeSession;

  setLocale(locale: string): void;
  setMarket(market: 'europe' | 'us' | 'asia'): void;
}
```

**Задачи:**
- [ ] Реализовать главный класс `DashboardAnalyzer`
- [ ] Добавить управление провайдерами (primary + fallback)
- [ ] Реализовать кэширование результатов (опционально)
- [ ] Добавить rate limiting для API запросов
- [ ] Реализовать batch обработку для оптимизации
- [ ] Добавить метрики (latency, success rate, cost tracking)

#### 2.2 Система локализации

**Структура:**
```typescript
// locales/de-DE.json
{
  "indicators": {
    "oil_pressure": {
      "name": "Öldruck",
      "description": "Niedriger Öldruck erkannt",
      "action": "Motor sofort abstellen"
    }
  },
  "severity": {
    "critical": "Kritisch",
    "high": "Hoch",
    "medium": "Mittel",
    "low": "Niedrig"
  }
}
```

**Задачи:**
- [ ] Создать структуру файлов локализации
- [ ] Перевести базу знаний на: EN, DE, FR, IT, ES, PL, NL
- [ ] Реализовать систему загрузки локалей
- [ ] Добавить fallback на английский
- [ ] Интегрировать i18n в ответы анализатора

#### 2.3 Тестирование Core модуля

**Задачи:**
- [ ] Unit тесты для всех классов (95%+ coverage)
- [ ] Integration тесты для AI провайдеров
- [ ] Тестовые изображения для каждого типа индикатора
- [ ] Mock провайдеры для тестов без API ключей
- [ ] Performance тесты (latency, throughput)
- [ ] Edge case тесты (поврежденные изображения, неизвестные индикаторы)

---

### ФАЗА 3: React интеграция (`@dashboard-module/react`) (3-5 дней)

#### 3.1 Хуки

**Задачи:**
- [ ] Портировать `useDashboardMechanic` в `useDashboardAnalyzer`
- [ ] Создать `useImageAnalysis` для статичных фото
- [ ] Создать `useRealtimeSession` для live режима
- [ ] Добавить `useIndicatorDatabase` для доступа к базе знаний
- [ ] Реализовать state management (результаты, ошибки, загрузка)

#### 3.2 Компоненты

**Задачи:**
- [ ] Создать `<DashboardScanner>` компонент (камера + загрузка)
- [ ] Создать `<IndicatorDisplay>` для визуализации результатов
- [ ] Создать `<RealtimeSession>` для live режима
- [ ] Добавить accessibility (ARIA labels, keyboard navigation)
- [ ] Стилизация (headless UI с Tailwind)

#### 3.3 Документация и примеры

**Задачи:**
- [ ] Создать пример Next.js приложения
- [ ] Создать пример Vite + React приложения
- [ ] Документировать все хуки и компоненты
- [ ] Добавить Storybook для компонентов

---

### ФАЗА 4: Node.js Server (`@dashboard-module/server`) (3-4 дня)

#### 4.1 REST API

**Endpoints:**
```
POST   /api/analyze          # Анализ изображения
POST   /api/batch            # Batch анализ
GET    /api/indicators       # Получить базу индикаторов
GET    /api/indicators/:id   # Получить конкретный индикатор
WS     /api/realtime         # WebSocket для real-time
GET    /health               # Health check
GET    /metrics              # Prometheus метрики
```

**Задачи:**
- [ ] Реализовать Express.js сервер
- [ ] Добавить аутентификацию (API keys, JWT)
- [ ] Реализовать rate limiting (по ключу/IP)
- [ ] Добавить CORS конфигурацию
- [ ] Логирование (Winston/Pino)
- [ ] Метрики (Prometheus)
- [ ] Docker образ для деплоя
- [ ] Helm chart для Kubernetes

#### 4.2 WebSocket сервер

**Задачи:**
- [ ] Реализовать WebSocket handler для real-time
- [ ] Добавить heartbeat/ping-pong
- [ ] Реализовать reconnection логику
- [ ] Масштабирование (Redis pub/sub для multi-instance)

#### 4.3 Документация API

**Задачи:**
- [ ] OpenAPI 3.0 спецификация
- [ ] Swagger UI для интерактивной документации
- [ ] Примеры запросов (curl, JavaScript, Python)
- [ ] Rate limits и квоты документация

---

### ФАЗА 5: CLI инструмент (`@dashboard-module/cli`) (2-3 дня)

#### 5.1 Команды

```bash
# Анализ изображения
dashboard-analyzer analyze ./image.jpg

# Batch обработка
dashboard-analyzer batch ./images/*.jpg --output results.json

# Интерактивный режим
dashboard-analyzer interactive

# Показать индикатор
dashboard-analyzer indicator oil_pressure --locale de

# Конфигурация
dashboard-analyzer config set provider openai
dashboard-analyzer config set apiKey sk-xxx
```

**Задачи:**
- [ ] Реализовать CLI с помощью Commander.js / Yargs
- [ ] Добавить интерактивный режим (Inquirer.js)
- [ ] Форматированный вывод (Chalk, CLI Table)
- [ ] Progress bar для batch обработки
- [ ] Конфигурация через файл (~/.dashboardrc)

---

### ФАЗА 6: Документация (3-4 дня)

#### 6.1 Основная документация

**Задачи:**
- [ ] Getting Started Guide
  - Установка
  - Быстрый старт
  - Основные концепции

- [ ] API Reference
  - Core API
  - React API
  - Server API
  - CLI Reference

- [ ] Guides
  - Интеграция в существующее приложение
  - Кастомизация AI промптов
  - Добавление новых индикаторов
  - Self-hosting инструкция
  - GDPR compliance

- [ ] European Market Guide
  - EU стандарты и регламенты
  - Country-specific правила (DE, FR, IT, ES, UK)
  - OBD-II integration
  - Technical inspection requirements

- [ ] Troubleshooting
  - Частые проблемы
  - Оптимизация производительности
  - Debugging guide

#### 6.2 Примеры (Examples)

**Задачи:**
- [ ] Next.js integration example
- [ ] Express.js backend example
- [ ] React Native mobile app example
- [ ] Vanilla JavaScript (CDN) example
- [ ] Python client example (для сервера)
- [ ] Docker compose example (full stack)

---

### ФАЗА 7: Тестирование и QA (4-5 дней)

#### 7.1 Unit & Integration тесты

**Задачи:**
- [ ] 95%+ code coverage для Core
- [ ] Integration тесты для всех AI провайдеров
- [ ] Тесты для всех локалей
- [ ] Performance benchmarks
- [ ] Memory leak тесты

#### 7.2 E2E тесты

**Задачи:**
- [ ] Playwright/Cypress тесты для React компонентов
- [ ] API E2E тесты (Supertest)
- [ ] WebSocket connection тесты
- [ ] CLI E2E тесты

#### 7.3 Реальные данные

**Задачи:**
- [ ] Собрать датасет из 100+ реальных фото приборных панелей
  - 20+ европейских брендов
  - Различные типы индикаторов
  - Разные условия освещения

- [ ] Тестирование на датасете
- [ ] Валидация точности (accuracy, precision, recall)
- [ ] Benchmark производительности

#### 7.4 Безопасность

**Задачи:**
- [ ] Security audit (npm audit, Snyk)
- [ ] GDPR compliance проверка
- [ ] API key безопасность (encryption at rest)
- [ ] Rate limiting тестирование
- [ ] Penetration testing (опционально)

---

### ФАЗА 8: Упаковка и публикация (2-3 дня)

#### 8.1 NPM пакеты

**Задачи:**
- [ ] Настроить monorepo publishing
- [ ] Semantic versioning
- [ ] Changelog генерация (conventional commits)
- [ ] README для каждого пакета
- [ ] License выбор (MIT / Apache 2.0)
- [ ] Публикация на npm
  - `@dashboard-module/core`
  - `@dashboard-module/react`
  - `@dashboard-module/server`
  - `@dashboard-module/cli`

#### 8.2 Docker образы

**Задачи:**
- [ ] Multi-stage Docker build
- [ ] Оптимизация размера образа
- [ ] Публикация на Docker Hub / GitHub Container Registry
- [ ] Docker Compose для быстрого старта

#### 8.3 GitHub Release

**Задачи:**
- [ ] GitHub Actions CI/CD
  - Tests
  - Build
  - Publish
  - Release notes
- [ ] Versioned releases с тегами
- [ ] Binary builds для CLI (pkg)

---

### ФАЗА 9: Marketing и Community (ongoing)

#### 9.1 Документация и сайт

**Задачи:**
- [ ] Создать документационный сайт (VitePress / Docusaurus)
- [ ] Интерактивные примеры (CodeSandbox embeds)
- [ ] Blog посты
  - "Introducing Dashboard Error Module"
  - "Building EU-compliant car diagnostics"
  - "How we achieve 95% accuracy"

#### 9.2 Open Source Community

**Задачи:**
- [ ] CONTRIBUTING.md
- [ ] CODE_OF_CONDUCT.md
- [ ] Issue templates
- [ ] Pull request templates
- [ ] Discord / Slack community (опционально)
- [ ] Twitter account для анонсов

#### 9.3 Интеграции

**Задачи:**
- [ ] Партнерства с европейскими автосервисами
- [ ] Интеграция с OBD-II сканерами
- [ ] Marketplace listings (AWS Marketplace, Azure Marketplace)
- [ ] Automotive API partnerships (Cariad, Stellantis APIs)

---

## 🔧 ТЕХНИЧЕСКИЙ СТЕК МОДУЛЯ

### Core Dependencies
- **TypeScript** 5.x
- **Zod** - Schema validation
- **dotenv** - Configuration
- **node-fetch** / **axios** - HTTP client
- **ws** - WebSocket client

### React Package
- **React** 18+ (peer dependency)
- **@tanstack/react-query** - Data fetching (опционально)

### Server Package
- **Express.js** 4.x
- **cors** - CORS middleware
- **helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **winston** / **pino** - Logging
- **prom-client** - Prometheus metrics

### CLI Package
- **commander** / **yargs** - CLI framework
- **inquirer** - Interactive prompts
- **chalk** - Colored output
- **ora** - Spinners
- **cli-table3** - Tables

### Build & Dev Tools
- **pnpm** - Package manager
- **Turborepo** - Monorepo orchestration
- **tsup** / **unbuild** - TypeScript bundler
- **vitest** - Testing
- **eslint** + **prettier** - Code quality
- **changeset** - Version management

---

## 📈 МЕТРИКИ УСПЕХА

### Технические метрики
- [ ] 95%+ code coverage
- [ ] <2s response time для статичного анализа
- [ ] <500ms latency для real-time режима
- [ ] 99.9% uptime для сервера
- [ ] Support 100+ concurrent real-time sessions

### Функциональные метрики
- [ ] 90%+ accuracy для распознавания индикаторов
- [ ] 95%+ accuracy для критических индикаторов (RED)
- [ ] Support 50+ типов индикаторов
- [ ] Support 20+ автомобильных брендов
- [ ] Support 7+ языков

### Бизнес метрики
- [ ] 1000+ npm downloads в первый месяц
- [ ] 50+ GitHub stars
- [ ] 10+ contributors
- [ ] 5+ integration partners в Европе

---

## 🌍 ЕВРОПЕЙСКАЯ СПЕЦИФИКА

### Поддержка стандартов
- **ISO 2575** - Символы органов управления и индикаторов
- **ECE R48** - Световые сигнальные устройства
- **EU 2009/40/EC** - Технический осмотр транспортных средств
- **EOBD** (European On-Board Diagnostics)

### Покрытие стран
| Страна | Приоритет | Специфика |
|--------|-----------|-----------|
| Германия | Высокий | TÜV, AU/HU, StVZO |
| Франция | Высокий | Contrôle Technique |
| Италия | Высокий | Revisione |
| Испания | Средний | ITV |
| UK | Средний | MOT (post-Brexit) |
| Польша | Средний | Badanie Techniczne |
| Нидерланды | Средний | APK |
| Бельгия | Низкий | Technische Controle |
| Швеция | Низкий | Besiktning |

### Локализация
- Мультиязычные сообщения
- Региональные форматы дат/валют
- Локальные стандарты (мм/дюймы, км/мили)

---

## 🚀 ROADMAP

### v1.0.0 - MVP (6-8 недель)
- ✅ Core модуль с OpenAI/Claude провайдерами
- ✅ База знаний европейских индикаторов
- ✅ React hooks и компоненты
- ✅ REST API сервер
- ✅ CLI инструмент
- ✅ Документация и примеры

### v1.1.0 - Европейские стандарты (2-3 недели)
- OBD-II интеграция
- EU регламенты и правила
- Country-specific требования
- Расширенная локализация (7+ языков)

### v1.2.0 - Performance (2-3 недели)
- Локальный AI провайдер (Ollama/llama.cpp)
- Кэширование и оптимизация
- Batch обработка улучшения
- WebWorker поддержка для браузера

### v2.0.0 - Advanced Features (2-3 месяца)
- Видео анализ (не только кадры)
- AR overlay для real-time (смартфон камера)
- Predictive maintenance (ML модель для прогнозов)
- Интеграция с телематикой автомобиля
- Blockchain для истории ремонтов (опционально)

---

## 💰 БИЗНЕС МОДЕЛЬ

### Open Source (MIT License)
- Core модуль - бесплатно
- React/CLI пакеты - бесплатно
- Community support

### Managed Service (SaaS)
- API as a Service
  - Free tier: 100 запросов/месяц
  - Pro: €29/мес - 5000 запросов
  - Business: €99/мес - 50000 запросов
  - Enterprise: Custom pricing

- Дополнительные сервисы
  - White-label решения
  - Custom AI модели
  - On-premise deployment support
  - Priority support

### B2B Partnerships
- Автосервисы (integration SDK)
- Страховые компании (claims processing)
- Carsharing platforms (vehicle condition tracking)
- OBD-II scanner manufacturers

---

## 📝 ПРИЛОЖЕНИЯ

### A. Сравнение с текущей реализацией

| Аспект | Текущая система | Модуль |
|--------|-----------------|--------|
| **Зависимости** | Next.js, React 19 | Framework-agnostic |
| **Deployment** | Vercel/Node.js | Любая платформа |
| **AI провайдеры** | OpenAI, Claude, Gemini | Расширяемая система |
| **Локализация** | Auto-detect | 7+ предустановленных языков |
| **EU фокус** | Базовый | Глубокая интеграция |
| **OBD-II** | Нет | Да |
| **Self-hosted** | Сложно | Docker one-liner |
| **API** | Нет | REST + WebSocket |
| **Тесты** | Базовые | 95%+ coverage |

### B. Список европейских автопроизводителей

**Германия:**
- Volkswagen, Audi, BMW, Mercedes-Benz, Porsche, Opel, Smart

**Франция:**
- Renault, Peugeot, Citroën, DS Automobiles, Bugatti, Alpine

**Италия:**
- Fiat, Alfa Romeo, Ferrari, Lamborghini, Maserati, Lancia

**Швеция:**
- Volvo, Saab (legacy), Koenigsegg, Polestar

**UK:**
- Jaguar, Land Rover, Aston Martin, McLaren, Bentley, Rolls-Royce, Lotus, Mini

**Другие:**
- SEAT (Испания), Škoda (Чехия), Dacia (Румыния)

### C. Типы индикаторов для покрытия

**Критические (RED):**
1. Oil pressure
2. Engine temperature
3. Brake system
4. Battery/charging
5. Airbag/SRS
6. Power steering

**Предупреждения (YELLOW):**
7. Check Engine/MIL
8. ABS
9. Traction Control/ESP
10. Tire Pressure/TPMS
11. Diesel Particulate Filter (DPF)
12. Glow Plug (diesel)
13. Electronic Power Control (EPC)
14. Service required
15. AdBlue/DEF low
16. Transmission
17. Lane departure warning
18. Blind spot
19. Adaptive cruise control
20. Pre-collision system

**Информационные (GREEN/BLUE):**
21-30. Lights, turn signals, cruise, eco mode, etc.

---

## 🔐 БЕЗОПАСНОСТЬ И COMPLIANCE

### GDPR Compliance
- [ ] Минимизация данных (только изображения, без PII)
- [ ] Right to erasure (API для удаления данных)
- [ ] Data portability (export в JSON)
- [ ] Consent management (для SaaS)
- [ ] Privacy policy

### Security Best Practices
- [ ] API keys в environment variables
- [ ] Encryption at rest (для SaaS)
- [ ] TLS 1.3 для transit
- [ ] Rate limiting против abuse
- [ ] Input validation (размер, формат)
- [ ] No sensitive data logging
- [ ] Regular dependency updates
- [ ] Security audit trail

---

## 📞 КОНТАКТЫ И РЕСУРСЫ

### Репозиторий
- **GitHub:** `https://github.com/your-org/dashboard-error-module`
- **npm:** `@dashboard-module/*`
- **Docker Hub:** `dashboard-module/server`

### Документация
- **Docs site:** `https://dashboard-module.dev`
- **API Reference:** `https://api.dashboard-module.dev`

### Community
- **Discord:** TBD
- **Twitter:** TBD
- **Email:** support@dashboard-module.dev

---

**Последнее обновление:** 2026-01-12
**Версия плана:** 1.0
**Статус:** В разработке

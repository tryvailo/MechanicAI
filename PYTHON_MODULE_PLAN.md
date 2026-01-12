# План работ: Python модуль распознавания ошибок приборной панели

## Дата создания: 2026-01-12
## Версия: MVP 1.0 (только статичные фото)

**Целевой рынок:** Европа
**Язык разработки:** Python 3.10+
**Цель:** Создать независимый Python модуль для распознавания ошибок приборной панели по фотографии

---

## 🎯 SCOPE MVP 1.0

### ✅ Что ВКЛЮЧЕНО
- ✅ Анализ статичных фотографий приборной панели
- ✅ Два режима: загрузка фото ИЛИ съёмка с камеры → анализ в чате
- ✅ Распознавание 30+ типов индикаторов
- ✅ OpenAI GPT-4o и Claude 3.5 провайдеры
- ✅ Fallback между провайдерами
- ✅ Мультиязычность (EN, DE, FR, IT, ES, PL, NL, RU)
- ✅ Европейские стандарты (ISO 2575, ECE R48, OBD-II)
- ✅ Python библиотека (pip install)
- ✅ FastAPI REST API сервер
- ✅ CLI инструмент
- ✅ Streamlit UI (опционально)

### ❌ Что НЕ включено (future versions)
- ❌ Real-time видеопоток анализ
- ❌ WebSocket connections
- ❌ Аудио вход/выход
- ❌ React компоненты
- ❌ Mobile app

---

## 📁 СТРУКТУРА ПРОЕКТА

```
dashboard-analyzer/
├── dashboard_analyzer/              # Главный Python пакет
│   ├── __init__.py
│   │
│   ├── core/                        # Ядро модуля
│   │   ├── __init__.py
│   │   ├── analyzer.py              # DashboardAnalyzer класс
│   │   ├── models.py                # Pydantic модели результатов
│   │   ├── config.py                # Конфигурация (Pydantic Settings)
│   │   └── exceptions.py            # Custom exceptions
│   │
│   ├── providers/                   # AI провайдеры
│   │   ├── __init__.py
│   │   ├── base.py                  # ABC BaseAIProvider
│   │   ├── openai_provider.py       # OpenAI GPT-4o
│   │   └── claude_provider.py       # Claude 3.5 Sonnet
│   │
│   ├── knowledge/                   # База знаний
│   │   ├── __init__.py
│   │   ├── indicators.py            # IndicatorKnowledgeBase
│   │   ├── data/
│   │   │   ├── indicators.json      # База индикаторов
│   │   │   ├── manufacturers.json   # Специфика брендов
│   │   │   ├── eu_standards.json    # EU регламенты
│   │   │   └── obd_mapping.json     # OBD-II коды
│   │   └── locales/
│   │       ├── en.json
│   │       ├── de.json
│   │       ├── fr.json
│   │       └── ...
│   │
│   ├── parsers/                     # Парсеры AI ответов
│   │   ├── __init__.py
│   │   ├── json_parser.py
│   │   └── text_parser.py
│   │
│   ├── utils/                       # Утилиты
│   │   ├── __init__.py
│   │   ├── image.py                 # PIL обработка
│   │   ├── cache.py                 # Кэширование
│   │   ├── logger.py                # Логирование
│   │   └── validators.py            # Валидация
│   │
│   └── prompts/                     # System prompts
│       ├── __init__.py
│       ├── dashboard.py             # Промпт для dashboard
│       └── templates.py             # Шаблоны промптов
│
├── dashboard_api/                   # FastAPI сервер (опционально)
│   ├── __init__.py
│   ├── main.py                      # FastAPI app
│   ├── routes.py                    # Endpoints
│   ├── deps.py                      # Dependencies
│   └── middleware.py                # CORS, rate limiting
│
├── dashboard_cli/                   # CLI инструмент
│   ├── __init__.py
│   └── cli.py                       # Typer CLI
│
├── scripts/                         # Вспомогательные скрипты
│   ├── convert_knowledge_base.py    # TS → JSON конвертер
│   └── validate_indicators.py       # Валидация JSON
│
├── tests/                           # Тесты (pytest)
│   ├── __init__.py
│   ├── conftest.py                  # Fixtures
│   ├── unit/
│   │   ├── test_analyzer.py
│   │   ├── test_providers.py
│   │   ├── test_parsers.py
│   │   └── test_knowledge.py
│   ├── integration/
│   │   └── test_full_flow.py
│   └── fixtures/
│       └── images/                  # Тестовые фото
│
├── examples/                        # Примеры использования
│   ├── 01_basic_usage.py
│   ├── 02_async_batch.py
│   ├── 03_fastapi_app.py
│   ├── 04_flask_app.py
│   ├── 05_streamlit_ui.py
│   └── 06_chat_integration.py
│
├── docs/                            # Документация (MkDocs)
│   ├── index.md
│   ├── quickstart.md
│   ├── api.md
│   ├── eu_standards.md
│   └── deployment.md
│
├── .github/
│   └── workflows/
│       ├── test.yml                 # CI/CD
│       └── publish.yml              # PyPI публикация
│
├── pyproject.toml                   # Poetry конфигурация
├── requirements.txt
├── requirements-dev.txt
├── Dockerfile                       # Для FastAPI сервера
├── docker-compose.yml
├── .env.example
├── README.md
└── LICENSE
```

---

## 🐍 PYTHON API

### Базовое использование

```python
from dashboard_analyzer import DashboardAnalyzer

# 1. Инициализация
analyzer = DashboardAnalyzer(
    openai_api_key="sk-xxx",
    primary_provider="openai",
    locale="de-DE"
)

# 2. Анализ из файла
result = analyzer.analyze("path/to/dashboard.jpg")

# 3. Результат
print(f"Severity: {result.severity}")  # 'critical' | 'high' | 'medium' | 'low'
print(f"Indicators: {len(result.indicators)}")

for ind in result.indicators:
    print(f"{ind.color.upper()} - {ind.name}: {ind.action}")
    if ind.obd_codes:
        print(f"  OBD-II: {', '.join(ind.obd_codes)}")
```

### Продвинутое использование

```python
from dashboard_analyzer import AsyncDashboardAnalyzer
from pathlib import Path
import asyncio

async def analyze_multiple():
    analyzer = AsyncDashboardAnalyzer(
        openai_api_key="sk-xxx",
        claude_api_key="sk-ant-xxx",
        primary_provider="openai",
        fallback_providers=["claude"],
        cache_enabled=True,
        locale="en"
    )

    # Batch анализ
    images = list(Path("images").glob("*.jpg"))
    results = await analyzer.analyze_batch(images)

    for img, result in zip(images, results):
        print(f"{img.name}: {result.severity}")

    return results

# Запуск
results = asyncio.run(analyze_multiple())
```

### Различные источники изображений

```python
from PIL import Image
import requests
from io import BytesIO

# 1. Из файла
result = analyzer.analyze("dashboard.jpg")

# 2. Из bytes
with open("dashboard.jpg", "rb") as f:
    result = analyzer.analyze(f.read())

# 3. Из PIL Image
img = Image.open("dashboard.jpg")
result = analyzer.analyze(img)

# 4. Из URL
response = requests.get("https://example.com/dashboard.jpg")
result = analyzer.analyze(response.content)

# 5. Из base64
import base64
with open("dashboard.jpg", "rb") as f:
    b64 = base64.b64encode(f.read()).decode()
result = analyzer.analyze_base64(b64)
```

### Чат-интерфейс интеграция

```python
# Пример для Telegram бота
from telegram import Update
from telegram.ext import Application, MessageHandler, filters

analyzer = DashboardAnalyzer(...)

async def handle_photo(update: Update, context):
    # Получаем фото от пользователя
    photo = await update.message.photo[-1].get_file()
    photo_bytes = await photo.download_as_bytearray()

    # Анализ
    result = await analyzer.analyze_async(bytes(photo_bytes))

    # Ответ пользователю
    if result.severity == "critical":
        message = f"🔴 КРИТИЧНО!\n\n{result.diagnosis}\n\n"
    else:
        message = f"Результат анализа:\n\n{result.diagnosis}\n\n"

    message += "Обнаруженные индикаторы:\n"
    for ind in result.indicators:
        emoji = "🔴" if ind.color == "red" else "🟡" if ind.color == "yellow" else "🟢"
        message += f"{emoji} {ind.name}\n"
        message += f"   {ind.action}\n"

    await update.message.reply_text(message)

# Регистрация handler
app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
```

---

## 🔌 FASTAPI REST API

```python
# dashboard_api/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from dashboard_analyzer import DashboardAnalyzer
from pydantic import BaseModel

app = FastAPI(title="Dashboard Analyzer API")
analyzer = DashboardAnalyzer(...)

@app.post("/analyze")
async def analyze_dashboard(
    image: UploadFile = File(...),
    locale: str = "en"
):
    """Анализ фотографии приборной панели"""
    if not image.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    contents = await image.read()
    result = await analyzer.analyze_async(contents, locale=locale)

    return result.dict()

@app.get("/indicators")
async def list_indicators(
    color: str | None = None,
    manufacturer: str | None = None
):
    """Получить список известных индикаторов"""
    kb = analyzer.knowledge_base

    if color:
        indicators = kb.filter_by_color(color)
    elif manufacturer:
        indicators = kb.get_by_manufacturer(manufacturer)
    else:
        indicators = list(kb.indicators.values())

    return indicators

# Запуск: uvicorn dashboard_api.main:app --reload
```

### Использование API

```bash
# Анализ фото
curl -X POST "http://localhost:8000/analyze" \
  -F "image=@dashboard.jpg" \
  -F "locale=de-DE"

# Список индикаторов
curl "http://localhost:8000/indicators?color=red"
```

---

## 💻 CLI ИНСТРУМЕНТ

```python
# dashboard_cli/cli.py
import typer
from pathlib import Path
from rich.console import Console
from rich.table import Table
from dashboard_analyzer import DashboardAnalyzer

app = typer.Typer()
console = Console()

@app.command()
def analyze(
    image_path: Path,
    locale: str = "en",
    provider: str = "openai",
    json_output: bool = False
):
    """Анализ фотографии приборной панели"""
    analyzer = DashboardAnalyzer(primary_provider=provider, locale=locale)

    with console.status(f"Analyzing {image_path.name}..."):
        result = analyzer.analyze(str(image_path))

    if json_output:
        console.print_json(result.json())
    else:
        # Pretty print
        console.print(f"\n[bold]Diagnosis:[/bold] {result.diagnosis}\n")
        console.print(f"[bold]Severity:[/bold] {result.severity.upper()}\n")

        if result.indicators:
            table = Table(title="Detected Indicators")
            table.add_column("Color", style="bold")
            table.add_column("Name")
            table.add_column("Action")

            for ind in result.indicators:
                color_emoji = "🔴" if ind.color == "red" else "🟡" if ind.color == "yellow" else "🟢"
                table.add_row(color_emoji, ind.name, ind.action)

            console.print(table)

@app.command()
def batch(
    directory: Path,
    output: Path = Path("results.json")
):
    """Batch анализ всех изображений в директории"""
    # ...

if __name__ == "__main__":
    app()
```

### Использование CLI

```bash
# Установка
pip install dashboard-analyzer[cli]

# Анализ одного фото
dashboard-analyzer analyze dashboard.jpg --locale de-DE

# JSON вывод
dashboard-analyzer analyze dashboard.jpg --json-output

# Batch обработка
dashboard-analyzer batch ./images/ --output results.json

# Список индикаторов
dashboard-analyzer indicators --color red
```

---

## 📊 PYDANTIC МОДЕЛИ

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

class DashboardIndicator(BaseModel):
    """Индикатор приборной панели"""
    id: str = Field(..., description="Уникальный ID индикатора")
    symbol: str = Field(..., description="Описание символа")
    color: Literal["red", "yellow", "green", "blue", "white"]
    state: Literal["solid", "flashing"] = "solid"
    category: Literal["critical", "warning", "info"]

    # Локализованные поля
    name: str
    description: str
    action: str

    # Дополнительная информация
    urgency: int = Field(ge=1, le=5, description="Уровень срочности 1-5")
    related_indicators: Optional[List[str]] = None
    manufacturer_specific: Optional[dict] = None
    eu_compliance: Optional[dict] = None
    obd_codes: Optional[List[str]] = None

class AnalysisResult(BaseModel):
    """Результат анализа изображения"""
    type: Literal["dashboard", "damage", "tire"]

    # Dashboard specific
    indicators: Optional[List[DashboardIndicator]] = None
    critical_warnings: Optional[List[str]] = None

    # Общие поля
    diagnosis: str
    severity: Literal["low", "medium", "high", "critical"]
    causes: List[str]
    recommendations: List[str]
    estimated_cost: Optional[dict] = None

    # Метаданные
    confidence: float = Field(ge=0.0, le=1.0)
    processing_time: float  # seconds
    provider_used: str
    timestamp: datetime = Field(default_factory=datetime.now)
    locale: str = "en"

class AnalyzerConfig(BaseModel):
    """Конфигурация анализатора"""
    # API Keys
    openai_api_key: Optional[str] = None
    claude_api_key: Optional[str] = None

    # Provider settings
    primary_provider: Literal["openai", "claude"] = "openai"
    fallback_providers: List[str] = []

    # Models
    openai_model: str = "gpt-4o"
    claude_model: str = "claude-3-5-sonnet-20241022"

    # General settings
    locale: str = "en"
    market: Literal["europe", "us", "asia"] = "europe"
    timeout: int = 30
    max_retries: int = 3
    cache_enabled: bool = True
```

---

## 🔧 ТЕХНИЧЕСКИЙ СТЕК

### Core Dependencies
```toml
[tool.poetry.dependencies]
python = "^3.10"
pydantic = "^2.5"
pydantic-settings = "^2.1"
pillow = "^10.1"
openai = "^1.6"
anthropic = "^0.8"
python-dotenv = "^1.0"
tenacity = "^8.2"  # Retry логика
httpx = "^0.25"    # Async HTTP client
```

### API Server (optional)
```toml
[tool.poetry.group.api]
optional = true

[tool.poetry.group.api.dependencies]
fastapi = "^0.108"
uvicorn = "^0.25"
python-multipart = "^0.0.6"
```

### CLI (optional)
```toml
[tool.poetry.group.cli]
optional = true

[tool.poetry.group.cli.dependencies]
typer = "^0.9"
rich = "^13.7"
```

### Dev Dependencies
```toml
[tool.poetry.group.dev.dependencies]
pytest = "^7.4"
pytest-asyncio = "^0.21"
pytest-cov = "^4.1"
black = "^23.12"
ruff = "^0.1"
mypy = "^1.7"
pre-commit = "^3.6"
```

---

## 📅 ПЛАН РАЗРАБОТКИ (4-5 недель)

### НЕДЕЛЯ 1: Core модуль
**Дни 1-2: Структура проекта**
- [ ] Создать структуру проекта (Poetry)
- [ ] Настроить pyproject.toml
- [ ] Создать Pydantic модели
- [ ] Настроить pre-commit hooks (black, ruff, mypy)

**Дни 3-4: AI Провайдеры**
- [ ] Реализовать BaseAIProvider (ABC)
- [ ] Портировать OpenAIProvider
- [ ] Портировать ClaudeProvider
- [ ] Добавить retry логику (tenacity)
- [ ] Unit тесты для провайдеров

**День 5: База знаний**
- [ ] Конвертировать TS → JSON (скрипт)
- [ ] Создать IndicatorKnowledgeBase
- [ ] Загрузка локализаций
- [ ] Unit тесты

### НЕДЕЛЯ 2: Анализатор и парсеры
**Дни 1-2: DashboardAnalyzer**
- [ ] Реализовать класс DashboardAnalyzer
- [ ] Обработка различных источников изображений
- [ ] Fallback логика между провайдерами
- [ ] Кэширование результатов

**Дни 3-4: Парсеры**
- [ ] JSON parser с валидацией
- [ ] Text parser (fallback)
- [ ] Обогащение результатов из базы знаний
- [ ] Unit тесты

**День 5: Integration тесты**
- [ ] Full flow тесты
- [ ] Тестовые изображения
- [ ] Mock провайдеры

### НЕДЕЛЯ 3: API и CLI
**Дни 1-2: FastAPI сервер**
- [ ] Endpoints: /analyze, /indicators
- [ ] File upload handling
- [ ] CORS, rate limiting
- [ ] Error handling
- [ ] OpenAPI документация

**Дни 3-4: CLI инструмент**
- [ ] Typer CLI app
- [ ] Commands: analyze, batch, indicators
- [ ] Rich output (tables, colors)
- [ ] Config file support

**День 5: Примеры**
- [ ] FastAPI integration example
- [ ] Flask integration example
- [ ] Telegram bot example
- [ ] Streamlit UI example

### НЕДЕЛЯ 4: Документация и тестирование
**Дни 1-2: Документация**
- [ ] README.md
- [ ] MkDocs сайт
- [ ] API reference (автогенерация)
- [ ] Quickstart guide
- [ ] EU standards документация

**Дни 3-4: Тестирование**
- [ ] 90%+ test coverage
- [ ] E2E тесты
- [ ] Performance тесты
- [ ] Собрать датасет изображений

**День 5: Публикация**
- [ ] Подготовка к PyPI
- [ ] GitHub Actions CI/CD
- [ ] Docker образ
- [ ] Релиз v1.0.0

---

## 🚀 ДЕПЛОЙ И ПУБЛИКАЦИЯ

### PyPI публикация
```bash
# Build
poetry build

# Publish to PyPI
poetry publish

# Install from PyPI
pip install dashboard-analyzer
pip install dashboard-analyzer[api]  # С FastAPI
pip install dashboard-analyzer[cli]  # С CLI
pip install dashboard-analyzer[all]  # Всё
```

### Docker
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY . .

RUN pip install -e .[api]

EXPOSE 8000
CMD ["uvicorn", "dashboard_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Build
docker build -t dashboard-analyzer-api .

# Run
docker run -p 8000:8000 \
  -e OPENAI_API_KEY=xxx \
  -e CLAUDE_API_KEY=xxx \
  dashboard-analyzer-api
```

### Docker Compose (с Redis для кэша)
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

---

## 📈 МЕТРИКИ УСПЕХА

### Технические
- [ ] 90%+ test coverage
- [ ] <2s response time для одного изображения
- [ ] 95%+ accuracy для критичных индикаторов (red)
- [ ] Support 30+ типов индикаторов
- [ ] Support 20+ автомобильных брендов

### Бизнес
- [ ] 500+ PyPI downloads в первый месяц
- [ ] 100+ GitHub stars
- [ ] 5+ contributors
- [ ] 10+ примеров интеграции

---

## 🌍 ЕВРОПЕЙСКАЯ СПЕЦИФИКА

### EU Стандарты
- ISO 2575 - Символы индикаторов
- ECE R48 - Световые сигнальные устройства
- EU 2009/40/EC - Технический осмотр
- EOBD - European On-Board Diagnostics

### Страны (приоритет)
1. 🇩🇪 Германия (TÜV, HU)
2. 🇫🇷 Франция (Contrôle Technique)
3. 🇮🇹 Италия (Revisione)
4. 🇪🇸 Испания (ITV)
5. 🇬🇧 UK (MOT)
6. 🇵🇱 Польша (Badanie Techniczne)
7. 🇳🇱 Нидерланды (APK)

### OBD-II Интеграция
```python
# Пример OBD mapping
{
  "check_engine": {
    "common_codes": ["P0420", "P0430", "P0171", "P0174"],
    "description": "Catalyst efficiency below threshold",
    "eu_emissions": "Euro 6 compliance issue"
  },
  "oil_pressure": {
    "common_codes": ["P0520", "P0521", "P0522"],
    "description": "Oil pressure sensor/switch circuit",
    "action": "CRITICAL - Stop immediately"
  }
}
```

---

## 🔄 ROADMAP

### v1.0 - MVP (4-5 недель) ✅
- Core библиотека
- FastAPI REST API
- CLI инструмент
- Базовая документация

### v1.1 - Улучшения (2-3 недели)
- Redis кэширование
- PostgreSQL для метрик
- Prometheus метрики
- Grafana дашборды

### v1.2 - EU Compliance (2 недели)
- Детальная OBD-II интеграция
- Country-specific правила
- Техосмотр requirements
- Расширенная локализация

### v2.0 - Advanced (future)
- Локальные AI модели (Ollama)
- Batch API оптимизация
- GraphQL API
- Mobile SDK (React Native binding)

---

**Готово к разработке! 🚀**
**Оценка времени: 4-5 недель до v1.0**
**Team size: 1-2 разработчика**

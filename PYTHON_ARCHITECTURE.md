# Архитектура Python модуля распознавания ошибок приборной панели

## Общая структура

```
┌─────────────────────────────────────────────────┐
│      DASHBOARD ANALYZER (Python Package)        │
│                                                  │
│  ┌────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │    Core    │  │  FastAPI    │  │   CLI    │ │
│  │  Library   │  │     API     │  │   Tool   │ │
│  └────────────┘  └─────────────┘  └──────────┘ │
└─────────────────────────────────────────────────┘
```

## Core модуль (dashboard_analyzer)

```
dashboard_analyzer/
│
├── core/                    # Ядро библиотеки
│   ├── analyzer.py          ──→ DashboardAnalyzer (main class)
│   ├── models.py            ──→ Pydantic модели
│   ├── config.py            ──→ AnalyzerConfig
│   └── exceptions.py        ──→ Custom exceptions
│
├── providers/               # AI провайдеры
│   ├── base.py              ──→ BaseAIProvider (ABC)
│   ├── openai_provider.py   ──→ OpenAI GPT-4o Vision
│   └── claude_provider.py   ──→ Claude 3.5 Sonnet
│
├── knowledge/               # База знаний
│   ├── indicators.py        ──→ IndicatorKnowledgeBase
│   ├── data/
│   │   ├── indicators.json  ──→ База индикаторов
│   │   ├── manufacturers.json
│   │   ├── eu_standards.json
│   │   └── obd_mapping.json
│   └── locales/
│       ├── en.json          ──→ Переводы
│       ├── de.json
│       └── ...
│
├── parsers/                 # Парсеры ответов AI
│   ├── json_parser.py       ──→ JSON extraction
│   └── text_parser.py       ──→ Fallback text parsing
│
├── utils/                   # Утилиты
│   ├── image.py             ──→ PIL обработка
│   ├── cache.py             ──→ Кэширование (LRU)
│   └── logger.py            ──→ Логирование
│
└── prompts/                 # System prompts
    └── dashboard.py         ──→ Промпт для анализа
```

---

## Поток данных - Анализ фото

```
┌─────────────────┐
│   User Input    │
│  • File path    │
│  • Bytes        │
│  • PIL Image    │
│  • URL          │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│   DashboardAnalyzer         │
│   .analyze(image)           │
└────────┬────────────────────┘
         │
         ├─→ Image validation (type, size)
         ├─→ Convert to bytes
         ├─→ Optional resize/optimize
         │
         ▼
┌─────────────────────────────┐
│   Check cache               │
│   (SHA256 hash)             │
└────────┬────────────────────┘
         │
    ┌────┴────┐
    │  Found? │
    └────┬────┘
         │
    YES  │  NO
         │
    ┌────▼───────────────────────┐
    │                            │
    ▼                            ▼
┌────────────┐        ┌──────────────────┐
│   Return   │        │  Select Provider │
│   cached   │        │  (primary/       │
│   result   │        │   fallback)      │
└────────────┘        └────────┬─────────┘
                              │
                              ▼
                ┌──────────────────────────┐
                │   Call AI Provider       │
                │   (OpenAI / Claude)      │
                └────────┬─────────────────┘
                         │
                         ├─→ System prompt (from knowledge base)
                         ├─→ User prompt
                         ├─→ Base64 image
                         │
                         ▼
                ┌──────────────────────────┐
                │   AI Vision Response     │
                │   (text/JSON)            │
                └────────┬─────────────────┘
                         │
                         ▼
                ┌──────────────────────────┐
                │   Response Parser        │
                │   • JSON extraction      │
                │   • Text fallback        │
                │   • Validation           │
                └────────┬─────────────────┘
                         │
                         ▼
                ┌──────────────────────────┐
                │   Knowledge Base         │
                │   Enrichment             │
                │   • Match indicators     │
                │   • Add OBD codes        │
                │   • Localize             │
                │   • EU compliance        │
                └────────┬─────────────────┘
                         │
                         ▼
                ┌──────────────────────────┐
                │   AnalysisResult         │
                │   (Pydantic model)       │
                │   • indicators[]         │
                │   • diagnosis            │
                │   • severity             │
                │   • recommendations      │
                └────────┬─────────────────┘
                         │
                         ├─→ Store in cache (15 min)
                         │
                         ▼
                    Return to user
```

---

## Класс DashboardAnalyzer

```python
from typing import Union, List
from pathlib import Path
from PIL import Image

class DashboardAnalyzer:
    """
    Главный класс для анализа приборной панели.

    Атрибуты:
        config (AnalyzerConfig): Конфигурация
        provider (BaseAIProvider): Текущий AI провайдер
        knowledge_base (IndicatorKnowledgeBase): База знаний
        cache (Cache): Кэш результатов
    """

    def __init__(self, config: AnalyzerConfig | None = None, **kwargs):
        self.config = config or AnalyzerConfig(**kwargs)
        self._setup_provider()
        self.knowledge_base = IndicatorKnowledgeBase(locale=self.config.locale)
        self.cache = Cache(enabled=self.config.cache_enabled)

    def _setup_provider(self):
        """Настройка AI провайдера с fallback"""
        if self.config.primary_provider == "openai":
            self.provider = OpenAIProvider(...)
        elif self.config.primary_provider == "claude":
            self.provider = ClaudeProvider(...)

    def analyze(
        self,
        image: Union[str, Path, bytes, Image.Image],
        mode: str = "auto",
        locale: str | None = None
    ) -> AnalysisResult:
        """
        Синхронный анализ изображения.

        Args:
            image: Изображение (путь, bytes, PIL Image)
            mode: Режим анализа ('auto', 'dashboard', 'damage', 'tire')
            locale: Локаль (переопределяет конфиг)

        Returns:
            AnalysisResult: Результат анализа
        """
        # 1. Prepare image
        image_bytes = self._prepare_image(image)

        # 2. Check cache
        cache_key = self._compute_hash(image_bytes)
        if cached := self.cache.get(cache_key):
            return cached

        # 3. Call AI provider
        try:
            response_text = self._call_provider(image_bytes, mode, locale)
        except Exception as e:
            # Fallback to secondary provider
            response_text = self._call_fallback_provider(image_bytes, mode, locale)

        # 4. Parse response
        result = self._parse_response(response_text, locale or self.config.locale)

        # 5. Enrich with knowledge base
        result = self._enrich_result(result)

        # 6. Cache result
        self.cache.set(cache_key, result)

        return result

    async def analyze_async(self, image, mode="auto", locale=None) -> AnalysisResult:
        """Асинхронная версия analyze()"""
        # Аналогично, но с async/await
        pass

    async def analyze_batch(self, images: List[...]) -> List[AnalysisResult]:
        """Параллельный анализ нескольких изображений"""
        import asyncio
        tasks = [self.analyze_async(img) for img in images]
        return await asyncio.gather(*tasks)

    def _prepare_image(self, image) -> bytes:
        """Конвертация входного изображения в bytes"""
        if isinstance(image, (str, Path)):
            return Path(image).read_bytes()
        elif isinstance(image, bytes):
            return image
        elif isinstance(image, Image.Image):
            from io import BytesIO
            buffer = BytesIO()
            image.save(buffer, format="JPEG")
            return buffer.getvalue()
        else:
            raise ValueError(f"Unsupported image type: {type(image)}")

    def _call_provider(self, image_bytes, mode, locale) -> str:
        """Вызов AI провайдера"""
        prompt = self._build_prompt(mode, locale)
        return self.provider.analyze_image(image_bytes, prompt)

    def _build_prompt(self, mode, locale) -> str:
        """Построение промпта на основе режима и локали"""
        from .prompts.dashboard import get_dashboard_prompt
        return get_dashboard_prompt(
            locale=locale,
            market=self.config.market
        )

    def _parse_response(self, text, locale) -> AnalysisResult:
        """Парсинг ответа AI"""
        from .parsers.json_parser import parse_json_response
        from .parsers.text_parser import parse_text_response

        try:
            # Попытка JSON парсинга
            data = parse_json_response(text)
        except Exception:
            # Fallback на текстовый парсинг
            data = parse_text_response(text)

        return AnalysisResult(**data, locale=locale)

    def _enrich_result(self, result: AnalysisResult) -> AnalysisResult:
        """Обогащение результата данными из базы знаний"""
        for indicator in result.indicators or []:
            # Дополнить индикатор данными из БД
            kb_indicator = self.knowledge_base.get_indicator(indicator.id)
            if kb_indicator:
                indicator.obd_codes = kb_indicator.get("obd_codes")
                indicator.eu_compliance = kb_indicator.get("eu_compliance")
                # Локализация
                indicator.name = self.knowledge_base.get_localized_text(
                    indicator.id, "name"
                )

        return result
```

---

## AI Provider Architecture

```python
from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseAIProvider(ABC):
    """
    Абстрактный базовый класс для AI провайдеров.

    Все провайдеры должны имплементировать:
    - analyze_image(): основной метод анализа
    - get_provider_name(): имя провайдера
    """

    def __init__(self, config: AIProviderConfig):
        self.config = config
        self.logger = logging.getLogger(self.__class__.__name__)

    @abstractmethod
    async def analyze_image(
        self,
        image_bytes: bytes,
        prompt: str,
        **kwargs
    ) -> str:
        """
        Анализ изображения через Vision API.

        Args:
            image_bytes: Изображение в bytes
            prompt: System/User промпт
            **kwargs: Дополнительные параметры

        Returns:
            str: Текстовый ответ от AI

        Raises:
            ProviderError: Если ошибка API
        """
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """Возвращает имя провайдера"""
        pass

    def _encode_image(self, image_bytes: bytes) -> str:
        """Base64 кодирование"""
        import base64
        return base64.b64encode(image_bytes).decode('utf-8')

    def _with_retry(self, func):
        """Retry decorator with exponential backoff"""
        from tenacity import retry, stop_after_attempt, wait_exponential

        @retry(
            stop=stop_after_attempt(self.config.max_retries),
            wait=wait_exponential(multiplier=1, min=2, max=10)
        )
        async def wrapper(*args, **kwargs):
            return await func(*args, **kwargs)

        return wrapper


class OpenAIProvider(BaseAIProvider):
    """OpenAI GPT-4o Vision провайдер"""

    def __init__(self, config: AIProviderConfig):
        super().__init__(config)
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(api_key=config.api_key)

    @BaseAIProvider._with_retry
    async def analyze_image(self, image_bytes: bytes, prompt: str, **kwargs) -> str:
        base64_image = self._encode_image(image_bytes)

        response = await self.client.chat.completions.create(
            model=self.config.model or "gpt-4o",
            messages=[
                {"role": "system", "content": self._get_system_prompt()},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000,
            temperature=0.3
        )

        content = response.choices[0].message.content
        self.logger.info(f"OpenAI analysis completed (tokens: {response.usage.total_tokens})")
        return content

    def get_provider_name(self) -> str:
        return "openai"

    def _get_system_prompt(self) -> str:
        """System prompt с базой знаний"""
        from ..prompts.dashboard import CAR_DIAGNOSTICS_SYSTEM_PROMPT
        return CAR_DIAGNOSTICS_SYSTEM_PROMPT


class ClaudeProvider(BaseAIProvider):
    """Anthropic Claude 3.5 Sonnet провайдер"""

    def __init__(self, config: AIProviderConfig):
        super().__init__(config)
        from anthropic import AsyncAnthropic
        self.client = AsyncAnthropic(api_key=config.api_key)

    @BaseAIProvider._with_retry
    async def analyze_image(self, image_bytes: bytes, prompt: str, **kwargs) -> str:
        base64_image = self._encode_image(image_bytes)

        response = await self.client.messages.create(
            model=self.config.model or "claude-3-5-sonnet-20241022",
            max_tokens=1000,
            system=self._get_system_prompt(),
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": base64_image
                            }
                        },
                        {"type": "text", "text": prompt}
                    ]
                }
            ]
        )

        content = response.content[0].text
        self.logger.info(f"Claude analysis completed")
        return content

    def get_provider_name(self) -> str:
        return "claude"
```

---

## FastAPI Integration

```python
# dashboard_api/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dashboard_analyzer import DashboardAnalyzer, AnalyzerConfig
import logging

# Setup
app = FastAPI(
    title="Dashboard Analyzer API",
    version="1.0.0",
    description="European car dashboard error recognition API"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене ограничить
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Analyzer instance
analyzer = DashboardAnalyzer(
    openai_api_key=os.getenv("OPENAI_API_KEY"),
    claude_api_key=os.getenv("CLAUDE_API_KEY"),
    primary_provider="openai",
    fallback_providers=["claude"],
    cache_enabled=True
)


@app.post("/api/v1/analyze")
@limiter.limit("10/minute")
async def analyze_dashboard(
    request: Request,
    image: UploadFile = File(..., description="Dashboard photo"),
    locale: str = Query("en", regex="^(en|de|fr|it|es|pl|nl|ru)$"),
    mode: str = Query("auto", regex="^(auto|dashboard|damage|tire)$")
):
    """
    Analyze dashboard photo and detect indicators.

    - **image**: JPEG/PNG image (max 5MB)
    - **locale**: Language code (en, de, fr, etc.)
    - **mode**: Analysis mode (auto, dashboard, damage, tire)
    """
    # Validate file type
    if not image.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image (JPEG/PNG)")

    # Validate file size
    contents = await image.read()
    if len(contents) > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(413, "File size must be less than 5MB")

    try:
        # Analyze
        result = await analyzer.analyze_async(
            image=contents,
            mode=mode,
            locale=locale
        )

        return result.dict()

    except Exception as e:
        logging.error(f"Analysis failed: {str(e)}")
        raise HTTPException(500, f"Analysis failed: {str(e)}")


@app.get("/api/v1/indicators")
async def list_indicators(
    color: str | None = Query(None, regex="^(red|yellow|green)$"),
    manufacturer: str | None = None,
    locale: str = Query("en")
):
    """
    Get list of known dashboard indicators.

    - **color**: Filter by color (red, yellow, green)
    - **manufacturer**: Filter by brand (bmw, mercedes, vw, etc.)
    - **locale**: Language for translations
    """
    kb = analyzer.knowledge_base

    if color:
        indicators = kb.filter_by_color(color)
    elif manufacturer:
        indicators = kb.get_by_manufacturer(manufacturer)
    else:
        indicators = list(kb.indicators.values())

    # Localize
    for ind in indicators:
        ind["name"] = kb.get_localized_text(ind["id"], "name")
        ind["description"] = kb.get_localized_text(ind["id"], "description")

    return {
        "count": len(indicators),
        "indicators": indicators
    }


@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "providers": {
            "openai": bool(os.getenv("OPENAI_API_KEY")),
            "claude": bool(os.getenv("CLAUDE_API_KEY"))
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## Использование в чат-боте (Telegram)

```python
import os
from telegram import Update
from telegram.ext import Application, MessageHandler, CommandHandler, filters
from dashboard_analyzer import DashboardAnalyzer

# Инициализация
analyzer = DashboardAnalyzer(
    openai_api_key=os.getenv("OPENAI_API_KEY"),
    locale="ru"  # Русская локализация по умолчанию
)

async def start(update: Update, context):
    """Команда /start"""
    await update.message.reply_text(
        "👋 Привет! Я бот для анализа приборной панели.\n\n"
        "Отправь мне фото приборной панели, и я расскажу:\n"
        "• Какие индикаторы горят\n"
        "• Что они означают\n"
        "• Что нужно делать\n\n"
        "Поддерживаемые языки: /lang"
    )

async def analyze_photo(update: Update, context):
    """Обработка фото"""
    # Показываем, что работаем
    await update.message.reply_text("🔍 Анализирую фотографию...")

    # Получаем фото
    photo = await update.message.photo[-1].get_file()
    photo_bytes = await photo.download_as_bytearray()

    try:
        # Анализ
        result = await analyzer.analyze_async(bytes(photo_bytes))

        # Форматируем ответ
        message = f"📊 **Результат анализа**\n\n"

        # Диагноз
        if result.severity == "critical":
            message += "🔴 **КРИТИЧНО!**\n\n"
        elif result.severity == "high":
            message += "🟠 **Высокая важность**\n\n"

        message += f"**Диагноз:** {result.diagnosis}\n\n"

        # Индикаторы
        if result.indicators:
            message += "**Обнаруженные индикаторы:**\n"
            for ind in result.indicators:
                emoji = {
                    "red": "🔴",
                    "yellow": "🟡",
                    "green": "🟢"
                }.get(ind.color, "⚪")

                message += f"\n{emoji} **{ind.name}**\n"
                message += f"   _{ind.description}_\n"
                message += f"   ▸ {ind.action}\n"

                if ind.obd_codes:
                    message += f"   📟 Коды: {', '.join(ind.obd_codes)}\n"

        # Рекомендации
        if result.recommendations:
            message += "\n**Рекомендации:**\n"
            for i, rec in enumerate(result.recommendations, 1):
                message += f"{i}. {rec}\n"

        # Стоимость (если есть)
        if result.estimated_cost:
            cost = result.estimated_cost
            message += f"\n💰 Ориентировочная стоимость: €{cost['min']}-{cost['max']}\n"

        await update.message.reply_markdown_v2(message)

    except Exception as e:
        await update.message.reply_text(
            f"❌ Ошибка при анализе: {str(e)}\n\n"
            "Попробуйте сфотографировать приборную панель более четко."
        )

def main():
    # Создаем приложение
    app = Application.builder().token(os.getenv("TELEGRAM_BOT_TOKEN")).build()

    # Регистрируем handlers
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.PHOTO, analyze_photo))

    # Запуск
    print("🤖 Bot started!")
    app.run_polling()

if __name__ == "__main__":
    main()
```

---

## Кэширование и производительность

```python
# utils/cache.py
import hashlib
import time
from typing import Any, Optional
from functools import lru_cache

class Cache:
    """
    In-memory cache с TTL для результатов анализа.
    Для production - использовать Redis.
    """

    def __init__(self, enabled: bool = True, ttl: int = 900):  # 15 min
        self.enabled = enabled
        self.ttl = ttl
        self._cache: dict[str, tuple[Any, float]] = {}

    def get(self, key: str) -> Optional[Any]:
        """Получить из кэша"""
        if not self.enabled:
            return None

        if key in self._cache:
            value, timestamp = self._cache[key]
            if time.time() - timestamp < self.ttl:
                return value
            else:
                # Expired
                del self._cache[key]

        return None

    def set(self, key: str, value: Any):
        """Сохранить в кэш"""
        if self.enabled:
            self._cache[key] = (value, time.time())

    def clear(self):
        """Очистить кэш"""
        self._cache.clear()

    @staticmethod
    def compute_hash(data: bytes) -> str:
        """Вычислить SHA256 хеш"""
        return hashlib.sha256(data).hexdigest()


# Redis версия (для production)
class RedisCache(Cache):
    """Redis-based cache для масштабирования"""

    def __init__(self, redis_url: str, enabled: bool = True, ttl: int = 900):
        super().__init__(enabled, ttl)
        import redis.asyncio as redis
        self.redis = redis.from_url(redis_url)

    async def get(self, key: str) -> Optional[Any]:
        if not self.enabled:
            return None

        data = await self.redis.get(f"dashboard:{key}")
        if data:
            import pickle
            return pickle.loads(data)
        return None

    async def set(self, key: str, value: Any):
        if self.enabled:
            import pickle
            await self.redis.setex(
                f"dashboard:{key}",
                self.ttl,
                pickle.dumps(value)
            )
```

---

## Тестирование

```python
# tests/unit/test_analyzer.py
import pytest
from dashboard_analyzer import DashboardAnalyzer
from dashboard_analyzer.core.models import AnalysisResult
from pathlib import Path

@pytest.fixture
def analyzer():
    """Создать analyzer с mock провайдером"""
    return DashboardAnalyzer(
        openai_api_key="test-key",
        cache_enabled=False
    )

@pytest.fixture
def sample_image():
    """Тестовое изображение"""
    return Path("tests/fixtures/images/bmw_check_engine.jpg")

def test_analyze_from_file(analyzer, sample_image):
    """Тест анализа из файла"""
    result = analyzer.analyze(sample_image)

    assert isinstance(result, AnalysisResult)
    assert result.type == "dashboard"
    assert result.severity in ["low", "medium", "high", "critical"]
    assert len(result.indicators) > 0

def test_analyze_from_bytes(analyzer, sample_image):
    """Тест анализа из bytes"""
    image_bytes = sample_image.read_bytes()
    result = analyzer.analyze(image_bytes)

    assert result is not None

@pytest.mark.asyncio
async def test_analyze_async(analyzer, sample_image):
    """Тест асинхронного анализа"""
    result = await analyzer.analyze_async(sample_image)

    assert isinstance(result, AnalysisResult)

@pytest.mark.asyncio
async def test_batch_analysis(analyzer):
    """Тест batch обработки"""
    images = list(Path("tests/fixtures/images").glob("*.jpg"))
    results = await analyzer.analyze_batch(images)

    assert len(results) == len(images)
    assert all(isinstance(r, AnalysisResult) for r in results)


# tests/integration/test_providers.py
@pytest.mark.integration
@pytest.mark.skipif(not os.getenv("OPENAI_API_KEY"), reason="No API key")
async def test_openai_provider_real():
    """Интеграционный тест с реальным OpenAI API"""
    from dashboard_analyzer.providers.openai_provider import OpenAIProvider

    provider = OpenAIProvider(...)
    image_bytes = Path("tests/fixtures/images/test.jpg").read_bytes()

    response = await provider.analyze_image(
        image_bytes,
        "Analyze this dashboard"
    )

    assert isinstance(response, str)
    assert len(response) > 0
```

---

## Deployment (Docker + Kubernetes)

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dashboard-analyzer-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dashboard-api
  template:
    metadata:
      labels:
        app: dashboard-api
    spec:
      containers:
      - name: api
        image: dashboard-analyzer:latest
        ports:
        - containerPort: 8000
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: ai-credentials
              key: openai-key
        - name: REDIS_URL
          value: redis://redis:6379
        resources:
          requests:
            memory: "256Mi"
            cpu: "500m"
          limits:
            memory: "512Mi"
            cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: dashboard-api-service
spec:
  selector:
    app: dashboard-api
  ports:
  - port: 80
    targetPort: 8000
  type: LoadBalancer
```

---

## Производительность

### Benchmarks (ожидаемые)
- **Одно изображение:** <2 сек (с кэшем: <100мс)
- **Batch 10 изображений:** <5 сек (параллельно)
- **Throughput:** ~30 req/min на одном инстансе
- **Memory:** ~250MB базовое, ~500MB под нагрузкой

### Оптимизации
- LRU кэш для повторяющихся изображений
- Redis для distributed кэша
- Async/await для параллельных запросов
- Image preprocessing (resize, optimize)
- Connection pooling для AI APIs

---

**Готово к разработке! 🚀**

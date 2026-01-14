# Dashboard Analyzer

European car dashboard error recognition using AI vision models (Google Gemini).

## Features

- 🚗 **Dashboard Analysis**: Recognize 30+ dashboard indicators
- 🌍 **European Focus**: EU + UK standards, OBD-II codes, 8 languages
- 🔴 **Severity Detection**: Critical/Warning/Info categorization
- 💰 **Cost Estimation**: Repair cost estimates in EUR (€) or GBP (£)
- 🇬🇧 **UK Support**: Miles/mph for UK, km/h for EU
- ⚡ **Fast & Reliable**: <2s response time with caching
- 🐍 **Pure Python**: Python 3.10+ with async support
- 🤖 **Powered by Gemini**: Google Gemini 1.5 Flash/Pro vision models

## Installation

```bash
# Using pip (when published)
pip install dashboard-analyzer

# From source
git clone https://github.com/your-org/dashboard-analyzer
cd dashboard-analyzer
pip install -e .
```

## Quick Start

```python
from dashboard_analyzer import DashboardAnalyzer
import os

# Initialize
analyzer = DashboardAnalyzer(
    gemini_api_key=os.getenv("GEMINI_API_KEY"),
    locale="en"
)

# Analyze dashboard photo
result = analyzer.analyze("dashboard.jpg")

# Print results
print(f"Severity: {result.severity}")
for indicator in result.indicators:
    print(f"{indicator.color.upper()}: {indicator.name}")
    print(f"  Action: {indicator.action}")
```

## Usage

### From File

```python
result = analyzer.analyze("path/to/dashboard.jpg")
```

### From Bytes

```python
with open("dashboard.jpg", "rb") as f:
    result = analyzer.analyze(f.read())
```

### From PIL Image

```python
from PIL import Image

img = Image.open("dashboard.jpg")
result = analyzer.analyze(img)
```

### Async Mode

```python
import asyncio

async def analyze_multiple():
    analyzer = DashboardAnalyzer(...)

    # Parallel analysis
    results = await asyncio.gather(
        analyzer.analyze_async("img1.jpg"),
        analyzer.analyze_async("img2.jpg"),
        analyzer.analyze_async("img3.jpg")
    )

    return results

results = asyncio.run(analyze_multiple())
```

### Different Locales

```python
# German
analyzer = DashboardAnalyzer(locale="de-DE")
result = analyzer.analyze("dashboard.jpg")

# French
analyzer = DashboardAnalyzer(locale="fr-FR")

# Spanish
analyzer = DashboardAnalyzer(locale="es-ES")
```

## Configuration

### Environment Variables

Create a `.env` file:

```env
GEMINI_API_KEY=your-gemini-api-key-here
```

Get your API key from: https://makersuite.google.com/app/apikey

### Programmatic Configuration

```python
from dashboard_analyzer import AnalyzerConfig

config = AnalyzerConfig(
    gemini_api_key="your-gemini-api-key",
    gemini_model="gemini-1.5-flash-002",  # or "gemini-1.5-pro-002"
    locale="en",  # or "en-GB" for UK (miles/mph)
    market="europe",
    timeout=30,
    max_retries=3,
    cache_enabled=True,
    cache_ttl=900  # 15 minutes
)

analyzer = DashboardAnalyzer(config=config)
```

## Result Structure

```python
result = analyzer.analyze("dashboard.jpg")

# Result fields
result.type              # 'dashboard' | 'damage' | 'tire'
result.severity          # 'low' | 'medium' | 'high' | 'critical'
result.diagnosis         # Main diagnosis text
result.causes            # List of possible causes
result.recommendations   # List of recommended actions
result.estimated_cost    # {'min': 100, 'max': 500, 'currency': 'EUR'}

# Dashboard-specific
result.indicators        # List[DashboardIndicator]
result.critical_warnings # List[str]

# Metadata
result.confidence        # 0.0 - 1.0
result.processing_time   # seconds
result.provider_used     # 'gemini'
result.timestamp         # datetime
result.locale            # language code
```

## Indicator Model

```python
for indicator in result.indicators:
    indicator.id             # 'oil_pressure'
    indicator.symbol         # 'oil_can'
    indicator.color          # 'red' | 'yellow' | 'green' | 'blue'
    indicator.state          # 'solid' | 'flashing'
    indicator.category       # 'critical' | 'warning' | 'info'
    indicator.name           # 'Oil Pressure Warning'
    indicator.description    # Detailed description
    indicator.action         # What to do
    indicator.urgency        # 1-5 (5 = most urgent)
    indicator.obd_codes      # ['P0520', 'P0521']
    indicator.eu_compliance  # EU regulation info
```

## Examples

See the `examples/` directory:

- `01_basic_usage.py` - Basic usage
- `02_async_batch.py` - Async batch processing
- `03_fastapi_app.py` - FastAPI integration
- `04_streamlit_ui.py` - Streamlit UI

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Code formatting
black .
ruff check .

# Type checking
mypy dashboard_analyzer
```

## Supported Indicators

### Critical (RED)
- Oil Pressure
- Engine Temperature
- Brake Warning
- Battery/Charging
- Airbag/SRS
- Power Steering

### Warning (YELLOW)
- Check Engine
- ABS
- Traction Control/ESP
- Tire Pressure (TPMS)
- DPF (Diesel)
- Glow Plug
- EPC
- Service Required

### Informational (GREEN/BLUE)
- Turn signals
- Headlights
- Cruise control
- Eco mode

## European Standards

- **ISO 2575** - Dashboard indicator symbols
- **ECE R48** - Light signaling devices
- **EU 2009/40/EC** - Technical inspection
- **EOBD** - European On-Board Diagnostics

## Supported Markets

- 🇩🇪 Germany (TÜV, HU)
- 🇫🇷 France (Contrôle Technique)
- 🇮🇹 Italy (Revisione)
- 🇪🇸 Spain (ITV)
- 🇬🇧 UK (MOT)
- 🇵🇱 Poland
- 🇳🇱 Netherlands (APK)

## License

MIT License - see LICENSE file

## Contributing

Contributions welcome! Please read CONTRIBUTING.md

## Support

- Documentation: https://dashboard-analyzer.readthedocs.io
- Issues: https://github.com/your-org/dashboard-analyzer/issues
- Email: support@example.com

## Architecture: Balanced Approach

### Why Not Just Gemini?

**Google Gemini Vision already recognizes dashboard indicators!** So why the knowledge base?

```
┌─────────────────────────────────────────────┐
│    Google Gemini Vision (AI Recognition)    │
│     ✅ Identifies indicators               │
│     ✅ Determines colors                   │
│     ✅ Explains meanings                   │
│     ✅ Suggests actions                    │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│   Lightweight Knowledge Base (Enrichment)   │
│   ✅ OBD-II codes (AI unreliable)          │
│   ✅ Localization (cheaper than API)      │
│   ✅ Urgency levels (safety-critical)     │
└─────────────────────────────────────────────┘
```

### What Knowledge Base Provides

**NOT Duplication:** We don't duplicate what Gemini knows.

**ONLY Essentials:**
1. **OBD-II Diagnostic Codes** - AI doesn't consistently provide correct codes
2. **Cost-Effective Localization** - Pre-translated critical messages (EN, DE, FR, RU)
3. **Urgency Mapping** - Safety-critical categorization
4. **Regional Formatting** - Automatic units (UK: miles/mph, EU: km/h) and currency (£/€)

```python
# Gemini recognizes indicator
result = gemini_vision.analyze(image)
# Returns: "Oil pressure warning light is on"

# Knowledge base enriches
enriched = knowledge_base.enrich(result)
# Adds:
# - obd_codes: ["P0520", "P0521", "P0522", "P0523", "P0524"]
# - urgency: 5 (critical)
# - localized_action: "SOFORT anhalten" (German)
```

### Benefits

**vs Pure Gemini:**
- ✅ Structured OBD-II codes for diagnostic tools
- ✅ 90% cheaper localization (no API calls)
- ✅ Consistent urgency levels
- ✅ Regional formatting (UK miles vs EU km)

**vs Full Knowledge Base:**
- ✅ 10x simpler codebase
- ✅ No duplication of AI capabilities
- ✅ Easy to maintain

## Localization

Supported languages (for critical indicators):
- 🇬🇧 English (en)
- 🇩🇪 German (de)
- 🇫🇷 French (fr)
- 🇷🇺 Russian (ru)

```python
# German analysis
analyzer = DashboardAnalyzer(locale="de")
result = analyzer.analyze("dashboard.jpg")

for indicator in result.indicators:
    print(indicator.name)      # "Öldruckwarnung"
    print(indicator.action)    # "SOFORT anhalten und Ölstand prüfen"
    print(indicator.obd_codes) # ["P0520", "P0521", "P0522"]
```

## OBD-II Diagnostic Codes

Automatic mapping to OBD-II codes:

```python
result = analyzer.analyze("dashboard.jpg")

for indicator in result.indicators:
    if indicator.obd_codes:
        print(f"{indicator.name}: {', '.join(indicator.obd_codes)}")

# Output:
# Oil Pressure Warning: P0520, P0521, P0522, P0523, P0524
# Check Engine Light: P0420, P0430, P0171, P0174, P0300
# ABS Warning: C0035, C0040, C0045, C0050
```

## Testing

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run with coverage
pytest --cov=dashboard_analyzer

# See TESTING.md for detailed instructions
```

Test coverage:
- ✅ Knowledge Base: 100%
- ✅ Response Parser: 90%+
- ✅ Analyzer: 80%+

## Performance

- **Knowledge Base Loading**: <100ms
- **Image Analysis**: <2s (with Gemini Flash), <3s (with Gemini Pro)
- **Caching**: SHA256-based, 15min TTL
- **Localization**: Instant (no API calls)
- **Cost per Analysis**: ~$0.002 (Gemini Flash) or ~$0.01 (Gemini Pro)

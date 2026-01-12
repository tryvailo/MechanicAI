# Dashboard Analyzer

European car dashboard error recognition using AI vision models.

## Features

- 🚗 **Dashboard Analysis**: Recognize 30+ dashboard indicators
- 🌍 **European Focus**: EU standards, OBD-II codes, 8 languages
- 🔴 **Severity Detection**: Critical/Warning/Info categorization
- 💰 **Cost Estimation**: Repair cost estimates in EUR
- ⚡ **Fast & Reliable**: <2s response time with caching
- 🐍 **Pure Python**: Python 3.10+ with async support

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
    openai_api_key=os.getenv("OPENAI_API_KEY"),
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
OPENAI_API_KEY=sk-...
```

### Programmatic Configuration

```python
from dashboard_analyzer import AnalyzerConfig

config = AnalyzerConfig(
    openai_api_key="sk-...",
    openai_model="gpt-4o",
    locale="en",
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
result.provider_used     # 'openai'
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

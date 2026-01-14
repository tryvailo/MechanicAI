# Testing Dashboard Analyzer

## Quick Start

```bash
cd dashboard-analyzer

# Install in development mode
pip install -e ".[dev]"

# Run all tests
pytest

# Run with coverage
pytest --cov=dashboard_analyzer --cov-report=html

# Run specific test file
pytest tests/unit/test_knowledge_base.py

# Run with verbose output
pytest -v
```

## Test Structure

```
tests/
├── conftest.py              # Pytest fixtures
├── unit/                    # Unit tests (no external deps)
│   ├── test_knowledge_base.py
│   ├── test_response_parser.py
│   └── test_analyzer.py
└── integration/             # Integration tests (optional, needs API key)
```

## Running Tests

### Without API Key (Unit Tests Only)

```bash
# Unit tests use mocks, no API needed
pytest tests/unit/
```

**Expected output:**
```
tests/unit/test_knowledge_base.py ............ [ 40%]
tests/unit/test_response_parser.py .......... [ 70%]
tests/unit/test_analyzer.py ................ [100%]

=================== 30 passed in 2.5s ===================
```

### With API Key (Full Integration)

```bash
# Set API key
export GEMINI_API_KEY=sk-your-key-here

# Run all tests including integration
pytest
```

## Test Coverage

Run tests with coverage report:

```bash
pytest --cov=dashboard_analyzer --cov-report=term-missing
```

**Expected coverage:**
- Knowledge Base: 100%
- Response Parser: 90%+
- Analyzer: 80%+ (mocked)

## Manual Testing

### Test Knowledge Base

```python
from dashboard_analyzer.knowledge.indicators import IndicatorKnowledgeBase

# English
kb_en = IndicatorKnowledgeBase(locale="en")
print(kb_en.get_obd_codes("oil_pressure"))
# Output: ['P0520', 'P0521', 'P0522', 'P0523', 'P0524']

print(kb_en.get_localized_name("oil_pressure"))
# Output: Oil Pressure Warning

# German
kb_de = IndicatorKnowledgeBase(locale="de")
print(kb_de.get_localized_name("oil_pressure"))
# Output: Öldruckwarnung

# French
kb_fr = IndicatorKnowledgeBase(locale="fr")
print(kb_fr.get_localized_name("oil_pressure"))
# Output: Pression d'huile faible

# Russian
kb_ru = IndicatorKnowledgeBase(locale="ru")
print(kb_ru.get_localized_name("oil_pressure"))
# Output: Низкое давление масла
```

### Test Full Analyzer (needs API key)

```python
import os
from dashboard_analyzer import DashboardAnalyzer

# Initialize
analyzer = DashboardAnalyzer(
    gemini_api_key=os.getenv("GEMINI_API_KEY"),
    locale="en"
)

# Test with image bytes
test_image = b"fake image data"  # Replace with real image
result = analyzer.analyze(test_image)

# Check result
print(f"Severity: {result.severity}")
print(f"Provider: {result.provider_used}")
print(f"Time: {result.processing_time:.2f}s")

if result.indicators:
    for ind in result.indicators:
        print(f"\n{ind.color.upper()}: {ind.name}")
        print(f"  Action: {ind.action}")
        if ind.obd_codes:
            print(f"  OBD: {', '.join(ind.obd_codes)}")
```

## Continuous Integration

GitHub Actions workflow (example):

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.10'
      - run: pip install -e ".[dev]"
      - run: pytest --cov --cov-report=xml
      - uses: codecov/codecov-action@v2
```

## Troubleshooting

### Import Errors

```bash
# Make sure package is installed
pip install -e .

# Or with dev dependencies
pip install -e ".[dev]"
```

### Missing Fixtures

```bash
# Knowledge base files should be present
ls dashboard_analyzer/knowledge/data/
# Should show: indicators.json

ls dashboard_analyzer/knowledge/locales/
# Should show: en.json, de.json, fr.json, ru.json
```

### API Key Issues

```bash
# Check if key is set
echo $GEMINI_API_KEY

# Or use .env file
echo "GEMINI_API_KEY=sk-xxx" > .env
```

## Test Fixtures

Available pytest fixtures (see `conftest.py`):

- `mock_openai_response` - Mocked Gemini Vision API response (fixture name for compatibility)
- `sample_indicator_data` - Sample dashboard indicator data

## Writing New Tests

Example test:

```python
def test_my_feature():
    """Test my new feature."""
    from dashboard_analyzer import DashboardAnalyzer
    
    analyzer = DashboardAnalyzer(gemini_api_key="test-key")
    # Test your feature
    assert analyzer is not None
```

## Performance Benchmarks

Run benchmarks:

```bash
pytest tests/ --benchmark-only
```

Expected performance:
- Knowledge base loading: <100ms
- Response parsing: <10ms
- Full analysis (mocked): <50ms

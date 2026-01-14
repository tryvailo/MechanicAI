"""Pytest configuration and fixtures."""

import pytest


@pytest.fixture
def mock_openai_response():
    """Mock Gemini vision API response (fixture name kept for compatibility)."""
    return """
{
  "photoType": "dashboard",
  "diagnosis": "Critical oil pressure warning detected",
  "severity": "critical",
  "causes": ["Low oil level", "Oil pump failure", "Oil leak"],
  "recommendations": ["Stop immediately", "Check oil level", "Call mechanic"],
  "summary": "Oil pressure warning - critical",
  "dashboardLights": [
    {
      "symbol": "oil_can",
      "color": "red",
      "meaning": "Oil Pressure Warning",
      "action": "STOP immediately and check oil level"
    }
  ]
}
"""


@pytest.fixture
def sample_indicator_data():
    """Sample indicator data from AI."""
    return {
        "id": "oil_pressure",
        "symbol": "oil_can",
        "color": "red",
        "state": "solid",
        "category": "critical",
        "name": "Oil Pressure Warning",
        "description": "Low oil pressure detected",
        "action": "STOP immediately",
        "urgency": 5,
    }

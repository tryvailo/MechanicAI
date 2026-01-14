"""Unit tests for response parser."""

import pytest
from dashboard_analyzer.parsers.response_parser import parse_ai_response


def test_parse_json_response(mock_openai_response):
    """Test parsing valid JSON response."""
    result = parse_ai_response(mock_openai_response)
    
    assert result["type"] == "dashboard"
    assert result["diagnosis"] is not None
    assert result["severity"] == "critical"
    assert isinstance(result["causes"], list)
    assert len(result["causes"]) > 0
    assert isinstance(result["recommendations"], list)


def test_parse_response_with_markdown_blocks():
    """Test parsing JSON wrapped in markdown code blocks."""
    response = """```json
{
  "diagnosis": "Test diagnosis",
  "severity": "high",
  "causes": ["Cause 1"],
  "recommendations": ["Action 1"]
}
```"""
    
    result = parse_ai_response(response)
    assert result["diagnosis"] == "Test diagnosis"
    assert result["severity"] == "high"


def test_parse_text_fallback():
    """Test text parsing when JSON fails."""
    response = """
    The dashboard shows a critical oil pressure warning.
    
    Severity: critical
    
    Causes:
    - Low oil level
    - Oil pump failure
    
    Recommendations:
    - Stop immediately
    - Check oil level
    """
    
    result = parse_ai_response(response)
    assert result["severity"] == "critical"
    assert isinstance(result["causes"], list)
    assert len(result["causes"]) > 0


def test_severity_normalization():
    """Test severity level normalization."""
    # Test various severity formats
    test_cases = [
        ('{"severity": "LOW"}', "low"),
        ('{"severity": "High"}', "high"),
        ('{"severity": "CRITICAL"}', "critical"),
        ('{"severity": "invalid"}', "medium"),  # Should default to medium
    ]
    
    for response, expected in test_cases:
        result = parse_ai_response(response)
        assert result["severity"] == expected


def test_empty_causes_and_recommendations():
    """Test handling of missing causes/recommendations."""
    response = '{"diagnosis": "Test", "severity": "low"}'
    
    result = parse_ai_response(response)
    assert isinstance(result["causes"], list)
    assert isinstance(result["recommendations"], list)
    # Should have defaults
    assert len(result["causes"]) > 0
    assert len(result["recommendations"]) > 0


def test_dashboard_lights_extraction():
    """Test extracting dashboard lights from response."""
    response = """{
  "dashboardLights": [
    {"symbol": "oil_can", "color": "red", "meaning": "Low oil", "action": "Stop"},
    {"symbol": "battery", "color": "red", "meaning": "Battery", "action": "Check"}
  ]
}"""
    
    result = parse_ai_response(response)
    assert "dashboard_lights" in result
    assert len(result["dashboard_lights"]) == 2
    assert result["dashboard_lights"][0]["symbol"] == "oil_can"

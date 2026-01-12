"""Unit tests for DashboardAnalyzer."""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from dashboard_analyzer import DashboardAnalyzer, AnalyzerConfig
from dashboard_analyzer.core.exceptions import ConfigurationError, InvalidImageError


def test_analyzer_requires_api_key():
    """Test that analyzer requires API key."""
    with pytest.raises(ConfigurationError):
        DashboardAnalyzer()


def test_analyzer_initialization_with_api_key():
    """Test analyzer initializes with API key."""
    analyzer = DashboardAnalyzer(openai_api_key="test-key")
    assert analyzer.config.openai_api_key == "test-key"
    assert analyzer.provider is not None


def test_analyzer_initialization_with_config():
    """Test analyzer initializes with config object."""
    config = AnalyzerConfig(openai_api_key="test-key", locale="de")
    analyzer = DashboardAnalyzer(config=config)
    assert analyzer.config.locale == "de"


def test_knowledge_base_is_optional():
    """Test that knowledge base is optional and doesn't break initialization."""
    # Even if knowledge base files are missing, analyzer should work
    analyzer = DashboardAnalyzer(openai_api_key="test-key")
    # Should initialize successfully (knowledge_base might be None)
    assert analyzer is not None


def test_compute_hash():
    """Test SHA256 hash computation."""
    analyzer = DashboardAnalyzer(openai_api_key="test-key")
    
    data = b"test data"
    hash1 = analyzer._compute_hash(data)
    hash2 = analyzer._compute_hash(data)
    
    assert hash1 == hash2  # Same data = same hash
    assert len(hash1) == 64  # SHA256 hex = 64 chars


def test_normalize_color():
    """Test color normalization."""
    analyzer = DashboardAnalyzer(openai_api_key="test-key")
    
    assert analyzer._normalize_color("RED") == "red"
    assert analyzer._normalize_color("bright red") == "red"
    assert analyzer._normalize_color("YELLOW") == "yellow"
    assert analyzer._normalize_color("amber") == "yellow"
    assert analyzer._normalize_color("GREEN") == "green"
    assert analyzer._normalize_color("BLUE") == "blue"
    assert analyzer._normalize_color("unknown") == "white"


def test_infer_category():
    """Test category inference from color."""
    analyzer = DashboardAnalyzer(openai_api_key="test-key")
    
    assert analyzer._infer_category("red") == "critical"
    assert analyzer._infer_category("yellow") == "warning"
    assert analyzer._infer_category("green") == "info"


def test_infer_urgency():
    """Test urgency inference from color."""
    analyzer = DashboardAnalyzer(openai_api_key="test-key")
    
    assert analyzer._infer_urgency("red") == 5
    assert analyzer._infer_urgency("yellow") == 3
    assert analyzer._infer_urgency("green") == 1


def test_prepare_image_from_bytes():
    """Test preparing image from bytes."""
    analyzer = DashboardAnalyzer(openai_api_key="test-key")
    
    test_bytes = b"fake image data"
    result = analyzer._prepare_image(test_bytes)
    assert result == test_bytes


def test_prepare_image_validates_size():
    """Test image size validation."""
    analyzer = DashboardAnalyzer(openai_api_key="test-key")
    
    # Create oversized image
    large_data = b"x" * (10 * 1024 * 1024)  # 10MB
    
    with pytest.raises(InvalidImageError, match="exceeds maximum"):
        analyzer._prepare_image(large_data)


@pytest.mark.asyncio
@patch('dashboard_analyzer.providers.openai_provider.AsyncOpenAI')
async def test_analyze_async_with_mock(mock_openai_class, mock_openai_response):
    """Test async analysis with mocked OpenAI."""
    # Setup mock
    mock_client = Mock()
    mock_completion = Mock()
    mock_completion.choices = [Mock(message=Mock(content=mock_openai_response))]
    mock_completion.usage = Mock(total_tokens=100, prompt_tokens=50, completion_tokens=50)
    
    mock_client.chat.completions.create = AsyncMock(return_value=mock_completion)
    mock_openai_class.return_value = mock_client
    
    # Test
    analyzer = DashboardAnalyzer(openai_api_key="test-key")
    
    # Mock image
    test_image = b"fake image"
    
    result = await analyzer.analyze_async(test_image)
    
    # Verify result
    assert result is not None
    assert result.severity == "critical"
    assert result.provider_used == "openai"
    assert result.processing_time > 0

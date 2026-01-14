"""Dashboard Analyzer - European car dashboard error recognition using AI vision."""

from .core.analyzer import DashboardAnalyzer
from .core.config import AnalyzerConfig
from .core.exceptions import (
    ConfigurationError,
    DashboardAnalyzerError,
    ImageProcessingError,
    InvalidImageError,
    ParsingError,
    ProviderError,
)
from .core.models import AnalysisResult, DashboardIndicator

__version__ = "0.1.0"

__all__ = [
    "DashboardAnalyzer",
    "AnalyzerConfig",
    "AnalysisResult",
    "DashboardIndicator",
    "DashboardAnalyzerError",
    "ConfigurationError",
    "ProviderError",
    "ImageProcessingError",
    "InvalidImageError",
    "ParsingError",
]

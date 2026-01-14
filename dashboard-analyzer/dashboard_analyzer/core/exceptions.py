"""Custom exceptions for dashboard analyzer."""


class DashboardAnalyzerError(Exception):
    """Base exception for dashboard analyzer."""

    pass


class ProviderError(DashboardAnalyzerError):
    """Error from AI provider."""

    pass


class ImageProcessingError(DashboardAnalyzerError):
    """Error during image processing."""

    pass


class InvalidImageError(DashboardAnalyzerError):
    """Invalid image format or size."""

    pass


class ConfigurationError(DashboardAnalyzerError):
    """Configuration error."""

    pass


class ParsingError(DashboardAnalyzerError):
    """Error parsing AI response."""

    pass

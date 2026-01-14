"""Configuration models for dashboard analyzer."""

from typing import Literal, Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class AnalyzerConfig(BaseSettings):
    """Main configuration for DashboardAnalyzer."""

    # API Keys
    gemini_api_key: Optional[str] = Field(None, alias="GEMINI_API_KEY")

    # Provider settings
    primary_provider: Literal["gemini"] = "gemini"
    gemini_model: str = "gemini-1.5-flash-002"

    # General settings
    locale: str = "en"
    market: Literal["europe", "us", "asia"] = "europe"
    timeout: int = 30
    max_retries: int = 3
    cache_enabled: bool = True
    cache_ttl: int = 900  # 15 minutes

    # Image processing
    max_image_size: int = 5 * 1024 * 1024  # 5MB
    max_image_dimension: int = 2048  # pixels

    class Config:
        """Pydantic settings config."""

        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


class AIProviderConfig(BaseSettings):
    """Configuration for AI provider."""

    api_key: str
    model: Optional[str] = None
    timeout: int = 30
    max_retries: int = 3

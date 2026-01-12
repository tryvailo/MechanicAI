"""Base AI provider abstract class."""

import base64
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict

from tenacity import retry, stop_after_attempt, wait_exponential

from ..core.config import AIProviderConfig
from ..core.exceptions import ProviderError


class BaseAIProvider(ABC):
    """Abstract base class for AI vision providers."""

    def __init__(self, config: AIProviderConfig):
        """
        Initialize provider.

        Args:
            config: Provider configuration
        """
        self.config = config
        self.logger = logging.getLogger(self.__class__.__name__)

    @abstractmethod
    async def analyze_image(
        self, image_bytes: bytes, prompt: str, system_prompt: str, **kwargs: Any
    ) -> str:
        """
        Analyze image using Vision API.

        Args:
            image_bytes: Image in bytes
            prompt: User prompt
            system_prompt: System instructions
            **kwargs: Additional parameters

        Returns:
            Text response from AI

        Raises:
            ProviderError: If API call fails
        """
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """
        Get provider name.

        Returns:
            Provider name string
        """
        pass

    def _encode_image(self, image_bytes: bytes) -> str:
        """
        Base64 encode image.

        Args:
            image_bytes: Image bytes

        Returns:
            Base64 encoded string
        """
        return base64.b64encode(image_bytes).decode("utf-8")

    def _create_retry_decorator(self) -> Any:
        """
        Create retry decorator with exponential backoff.

        Returns:
            Retry decorator
        """
        return retry(
            stop=stop_after_attempt(self.config.max_retries),
            wait=wait_exponential(multiplier=1, min=2, max=10),
            reraise=True,
        )

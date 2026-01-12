"""OpenAI GPT-4o Vision provider."""

import logging
from typing import Any

from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from ..core.config import AIProviderConfig
from ..core.exceptions import ProviderError
from .base import BaseAIProvider


class OpenAIProvider(BaseAIProvider):
    """OpenAI GPT-4o Vision provider."""

    def __init__(self, config: AIProviderConfig):
        """
        Initialize OpenAI provider.

        Args:
            config: Provider configuration
        """
        super().__init__(config)
        self.client = AsyncOpenAI(api_key=config.api_key, timeout=config.timeout)
        self.model = config.model or "gpt-4o"

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    async def analyze_image(
        self, image_bytes: bytes, prompt: str, system_prompt: str, **kwargs: Any
    ) -> str:
        """
        Analyze image using OpenAI Vision API.

        Args:
            image_bytes: Image in bytes
            prompt: User prompt
            system_prompt: System instructions
            **kwargs: Additional parameters (temperature, max_tokens, etc.)

        Returns:
            Text response from GPT-4o

        Raises:
            ProviderError: If API call fails
        """
        try:
            # Encode image to base64
            base64_image = self._encode_image(image_bytes)

            # Prepare messages
            messages = [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            },
                        },
                    ],
                },
            ]

            # Call OpenAI API
            self.logger.info(f"Calling OpenAI API with model {self.model}")
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=kwargs.get("max_tokens", 1000),
                temperature=kwargs.get("temperature", 0.3),
            )

            # Extract response
            content = response.choices[0].message.content
            if not content:
                raise ProviderError("Empty response from OpenAI")

            # Log usage
            usage = response.usage
            self.logger.info(
                f"OpenAI analysis completed - "
                f"tokens: {usage.total_tokens} "
                f"(prompt: {usage.prompt_tokens}, completion: {usage.completion_tokens})"
            )

            return content

        except Exception as e:
            self.logger.error(f"OpenAI API error: {str(e)}")
            raise ProviderError(f"OpenAI API error: {str(e)}") from e

    def get_provider_name(self) -> str:
        """
        Get provider name.

        Returns:
            'openai'
        """
        return "openai"

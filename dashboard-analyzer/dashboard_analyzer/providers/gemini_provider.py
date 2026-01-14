"""Google Gemini Vision provider."""

import logging
from typing import Any

import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from tenacity import retry, stop_after_attempt, wait_exponential

from ..core.config import AIProviderConfig
from ..core.exceptions import ProviderError
from .base import BaseAIProvider


class GeminiProvider(BaseAIProvider):
    """Google Gemini Vision provider."""

    def __init__(self, config: AIProviderConfig):
        """
        Initialize Gemini provider.

        Args:
            config: Provider configuration
        """
        super().__init__(config)

        # Configure Gemini
        genai.configure(api_key=config.api_key)

        # Set model (default: gemini-1.5-flash-002 for cost efficiency)
        self.model_name = config.model or "gemini-1.5-flash-002"

        # Initialize model
        self.model = genai.GenerativeModel(
            model_name=self.model_name,
            safety_settings={
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            },
        )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    async def analyze_image(
        self, image_bytes: bytes, prompt: str, system_prompt: str, **kwargs: Any
    ) -> str:
        """
        Analyze image using Gemini Vision API.

        Args:
            image_bytes: Image in bytes
            prompt: User prompt
            system_prompt: System instructions
            **kwargs: Additional parameters (temperature, max_tokens, etc.)

        Returns:
            Text response from Gemini

        Raises:
            ProviderError: If API call fails
        """
        try:
            # Prepare image data
            from PIL import Image
            import io

            image = Image.open(io.BytesIO(image_bytes))

            # Combine system prompt and user prompt
            # Gemini doesn't have separate system/user roles like OpenAI
            # So we prepend system instructions to the prompt
            full_prompt = f"{system_prompt}\n\n---\n\n{prompt}"

            # Prepare generation config
            generation_config = genai.GenerationConfig(
                temperature=kwargs.get("temperature", 0.3),
                max_output_tokens=kwargs.get("max_tokens", 2000),
                top_p=kwargs.get("top_p", 0.95),
                top_k=kwargs.get("top_k", 40),
            )

            # Call Gemini API
            self.logger.info(f"Calling Gemini API with model {self.model_name}")

            response = await self.model.generate_content_async(
                contents=[full_prompt, image],
                generation_config=generation_config,
            )

            # Check if response was blocked
            if not response.candidates:
                raise ProviderError("Response was blocked by safety filters")

            # Extract response text
            content = response.text
            if not content:
                raise ProviderError("Empty response from Gemini")

            # Log usage (Gemini provides token counts)
            try:
                usage = response.usage_metadata
                self.logger.info(
                    f"Gemini analysis completed - "
                    f"tokens: {usage.total_token_count} "
                    f"(prompt: {usage.prompt_token_count}, "
                    f"completion: {usage.candidates_token_count})"
                )
            except AttributeError:
                self.logger.info("Gemini analysis completed (usage data unavailable)")

            return content

        except Exception as e:
            self.logger.error(f"Gemini API error: {str(e)}")
            raise ProviderError(f"Gemini API error: {str(e)}") from e

    def get_provider_name(self) -> str:
        """
        Get provider name.

        Returns:
            'gemini'
        """
        return "gemini"

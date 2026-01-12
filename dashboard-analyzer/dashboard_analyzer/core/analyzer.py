"""Main DashboardAnalyzer class."""

import hashlib
import logging
import time
from pathlib import Path
from typing import Any, Dict, Literal, Optional, Union

from PIL import Image

from ..knowledge.indicators import IndicatorKnowledgeBase
from ..parsers.response_parser import parse_ai_response
from ..prompts.dashboard import CAR_DIAGNOSTICS_SYSTEM_PROMPT, get_user_prompt
from ..providers.openai_provider import OpenAIProvider
from .config import AIProviderConfig, AnalyzerConfig
from .exceptions import ConfigurationError, ImageProcessingError, InvalidImageError
from .models import AnalysisResult, DashboardIndicator


logger = logging.getLogger(__name__)


class DashboardAnalyzer:
    """Main class for analyzing dashboard photos."""

    def __init__(
        self,
        config: Optional[AnalyzerConfig] = None,
        openai_api_key: Optional[str] = None,
        **kwargs: Any,
    ):
        """
        Initialize DashboardAnalyzer.

        Args:
            config: Analyzer configuration
            openai_api_key: OpenAI API key (overrides config)
            **kwargs: Additional config parameters

        Raises:
            ConfigurationError: If API key is missing
        """
        # Load configuration
        if config is None:
            config = AnalyzerConfig(**kwargs)

        # Override API key if provided
        if openai_api_key:
            config.openai_api_key = openai_api_key

        if not config.openai_api_key:
            raise ConfigurationError(
                "OpenAI API key is required. "
                "Set OPENAI_API_KEY environment variable or pass openai_api_key parameter."
            )

        self.config = config

        # Initialize provider
        provider_config = AIProviderConfig(
            api_key=config.openai_api_key,
            model=config.openai_model,
            timeout=config.timeout,
            max_retries=config.max_retries,
        )
        self.provider = OpenAIProvider(provider_config)

        # Initialize knowledge base (optional - for OBD codes and localization)
        try:
            self.knowledge_base = IndicatorKnowledgeBase(locale=config.locale)
            logger.info(f"Knowledge base loaded for locale={config.locale}")
        except Exception as e:
            logger.warning(f"Failed to load knowledge base: {e}. Continuing without it.")
            self.knowledge_base = None

        # Cache for results
        self._cache: Dict[str, AnalysisResult] = {}

        logger.info(f"DashboardAnalyzer initialized with locale={config.locale}")

    def analyze(
        self,
        image: Union[str, Path, bytes, Image.Image],
        mode: Literal["auto", "dashboard", "damage", "tire"] = "auto",
        locale: Optional[str] = None,
        additional_context: str = "",
    ) -> AnalysisResult:
        """
        Analyze dashboard photo (synchronous wrapper).

        Args:
            image: Image path, bytes, PIL Image, or URL
            mode: Analysis mode
            locale: Language code (overrides config)
            additional_context: Additional user context

        Returns:
            AnalysisResult

        Raises:
            ImageProcessingError: If image processing fails
            ProviderError: If AI provider fails
        """
        import asyncio

        return asyncio.run(self.analyze_async(image, mode, locale, additional_context))

    async def analyze_async(
        self,
        image: Union[str, Path, bytes, Image.Image],
        mode: Literal["auto", "dashboard", "damage", "tire"] = "auto",
        locale: Optional[str] = None,
        additional_context: str = "",
    ) -> AnalysisResult:
        """
        Analyze dashboard photo asynchronously.

        Args:
            image: Image path, bytes, PIL Image, or URL
            mode: Analysis mode
            locale: Language code (overrides config)
            additional_context: Additional user context

        Returns:
            AnalysisResult

        Raises:
            ImageProcessingError: If image processing fails
            ProviderError: If AI provider fails
        """
        start_time = time.time()

        # Prepare image
        image_bytes = self._prepare_image(image)

        # Check cache
        if self.config.cache_enabled:
            cache_key = self._compute_hash(image_bytes)
            if cache_key in self._cache:
                logger.info("Returning cached result")
                return self._cache[cache_key]

        # Build prompts
        system_prompt = CAR_DIAGNOSTICS_SYSTEM_PROMPT
        user_prompt = get_user_prompt(
            locale=locale or self.config.locale, additional_context=additional_context
        )

        # Call AI provider
        logger.info(f"Analyzing image with {self.provider.get_provider_name()}")
        response_text = await self.provider.analyze_image(
            image_bytes=image_bytes, prompt=user_prompt, system_prompt=system_prompt
        )

        # Parse response
        parsed_data = parse_ai_response(response_text)

        # Build result
        processing_time = time.time() - start_time
        result = self._build_result(
            parsed_data=parsed_data,
            locale=locale or self.config.locale,
            processing_time=processing_time,
        )

        # Cache result
        if self.config.cache_enabled:
            self._cache[cache_key] = result

        return result

    def _prepare_image(self, image: Union[str, Path, bytes, Image.Image]) -> bytes:
        """
        Convert various image inputs to bytes.

        Args:
            image: Image in various formats

        Returns:
            Image as bytes

        Raises:
            InvalidImageError: If image format is invalid
            ImageProcessingError: If processing fails
        """
        try:
            if isinstance(image, (str, Path)):
                # From file path
                path = Path(image)
                if not path.exists():
                    raise InvalidImageError(f"Image file not found: {path}")
                image_bytes = path.read_bytes()

            elif isinstance(image, bytes):
                # Already bytes
                image_bytes = image

            elif isinstance(image, Image.Image):
                # From PIL Image
                from io import BytesIO

                buffer = BytesIO()
                image.save(buffer, format="JPEG")
                image_bytes = buffer.getvalue()

            else:
                raise InvalidImageError(f"Unsupported image type: {type(image)}")

            # Validate size
            if len(image_bytes) > self.config.max_image_size:
                raise InvalidImageError(
                    f"Image size {len(image_bytes)} bytes exceeds maximum "
                    f"{self.config.max_image_size} bytes"
                )

            return image_bytes

        except Exception as e:
            if isinstance(e, (InvalidImageError, ImageProcessingError)):
                raise
            raise ImageProcessingError(f"Failed to process image: {e}") from e

    def _compute_hash(self, data: bytes) -> str:
        """
        Compute SHA256 hash of data.

        Args:
            data: Bytes to hash

        Returns:
            Hex digest string
        """
        return hashlib.sha256(data).hexdigest()

    def _build_result(
        self, parsed_data: Dict[str, Any], locale: str, processing_time: float
    ) -> AnalysisResult:
        """
        Build AnalysisResult from parsed data.

        Args:
            parsed_data: Parsed AI response
            locale: Language code
            processing_time: Processing time in seconds

        Returns:
            AnalysisResult model
        """
        # Extract dashboard indicators if present
        indicators = None
        if parsed_data.get("dashboard_lights"):
            indicators = []
            for light in parsed_data["dashboard_lights"]:
                # Map to DashboardIndicator model
                indicator_dict = {
                    "id": light.get("symbol", "unknown").lower().replace(" ", "_"),
                    "symbol": light.get("symbol", "unknown"),
                    "color": self._normalize_color(light.get("color", "yellow")),
                    "state": "solid",  # Default, AI doesn't always specify
                    "category": self._infer_category(light.get("color", "yellow")),
                    "name": light.get("meaning", "Unknown indicator"),
                    "description": light.get("meaning", ""),
                    "action": light.get("action", "Consult mechanic"),
                    "urgency": self._infer_urgency(light.get("color", "yellow")),
                }

                # Enrich with knowledge base (OBD codes, localization)
                if self.knowledge_base:
                    indicator_dict = self.knowledge_base.enrich_indicator(indicator_dict)

                indicator = DashboardIndicator(**indicator_dict)
                indicators.append(indicator)

        return AnalysisResult(
            type=parsed_data.get("type", "dashboard"),
            indicators=indicators,
            diagnosis=parsed_data.get("diagnosis", ""),
            severity=parsed_data.get("severity", "medium"),
            causes=parsed_data.get("causes", []),
            recommendations=parsed_data.get("recommendations", []),
            estimated_cost=self._parse_cost(parsed_data.get("estimated_cost")),
            processing_time=processing_time,
            provider_used=self.provider.get_provider_name(),
            locale=locale,
        )

    def _normalize_color(self, color: str) -> str:
        """Normalize color string."""
        color_lower = color.lower()
        if "red" in color_lower:
            return "red"
        elif "yellow" in color_lower or "amber" in color_lower:
            return "yellow"
        elif "green" in color_lower:
            return "green"
        elif "blue" in color_lower:
            return "blue"
        else:
            return "white"

    def _infer_category(self, color: str) -> str:
        """Infer category from color."""
        normalized = self._normalize_color(color)
        if normalized == "red":
            return "critical"
        elif normalized == "yellow":
            return "warning"
        else:
            return "info"

    def _infer_urgency(self, color: str) -> int:
        """Infer urgency level from color."""
        normalized = self._normalize_color(color)
        if normalized == "red":
            return 5
        elif normalized == "yellow":
            return 3
        else:
            return 1

    def _parse_cost(self, cost_str: Optional[str]) -> Optional[Dict[str, Any]]:
        """
        Parse cost estimation string.

        Args:
            cost_str: Cost string like "€100-300"

        Returns:
            Dictionary with min, max, currency or None
        """
        if not cost_str:
            return None

        import re

        match = re.search(r"€?(\d+)-(\d+)", cost_str)
        if match:
            return {"min": int(match.group(1)), "max": int(match.group(2)), "currency": "EUR"}

        return None

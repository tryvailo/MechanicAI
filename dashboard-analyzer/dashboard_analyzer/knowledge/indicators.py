"""Lightweight indicator knowledge base for OBD codes and localization."""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class IndicatorKnowledgeBase:
    """
    Lightweight knowledge base for dashboard indicators.
    
    Purpose:
    - Provide OBD-II diagnostic codes
    - Offer basic localization for critical indicators
    - Enrich AI responses with structured data
    
    Note: This is OPTIONAL - OpenAI does the actual recognition.
    """

    def __init__(self, locale: str = "en"):
        """
        Initialize knowledge base.

        Args:
            locale: Language code (en, de, fr, ru, etc.)
        """
        self.locale = locale
        self.indicators: Dict = {}
        self.translations: Dict = {}
        self._load_data()

    def _load_data(self) -> None:
        """Load indicators data and translations."""
        try:
            # Load indicators (OBD codes, urgency, category)
            indicators_path = Path(__file__).parent / "data" / "indicators.json"
            if indicators_path.exists():
                with open(indicators_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.indicators = data.get("indicators", {})
                logger.info(f"Loaded {len(self.indicators)} indicators")
            else:
                logger.warning(f"Indicators file not found: {indicators_path}")

            # Load translations
            locale_path = Path(__file__).parent / "locales" / f"{self.locale}.json"
            if locale_path.exists():
                with open(locale_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.translations = data.get("indicators", {})
                logger.info(f"Loaded translations for {self.locale}")
            else:
                logger.warning(f"Translations not found for {self.locale}, using English")
                # Fallback to English
                en_path = Path(__file__).parent / "locales" / "en.json"
                if en_path.exists():
                    with open(en_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        self.translations = data.get("indicators", {})

        except Exception as e:
            logger.error(f"Failed to load knowledge base: {e}")
            # Non-critical - we can work without it
            self.indicators = {}
            self.translations = {}

    def get_obd_codes(self, indicator_id: str) -> List[str]:
        """
        Get OBD-II diagnostic codes for an indicator.

        Args:
            indicator_id: Indicator ID (e.g., 'oil_pressure')

        Returns:
            List of OBD codes or empty list
        """
        indicator = self.indicators.get(indicator_id, {})
        return indicator.get("obd_codes", [])

    def get_urgency(self, indicator_id: str) -> int:
        """
        Get urgency level (1-5, where 5 = critical).

        Args:
            indicator_id: Indicator ID

        Returns:
            Urgency level (1-5) or 3 as default
        """
        indicator = self.indicators.get(indicator_id, {})
        return indicator.get("urgency", 3)

    def get_category(self, indicator_id: str) -> str:
        """
        Get category (critical, warning, info).

        Args:
            indicator_id: Indicator ID

        Returns:
            Category string
        """
        indicator = self.indicators.get(indicator_id, {})
        return indicator.get("category", "warning")

    def get_localized_name(self, indicator_id: str) -> Optional[str]:
        """
        Get localized indicator name.

        Args:
            indicator_id: Indicator ID

        Returns:
            Localized name or None
        """
        translation = self.translations.get(indicator_id, {})
        return translation.get("name")

    def get_localized_action(self, indicator_id: str) -> Optional[str]:
        """
        Get localized action recommendation.

        Args:
            indicator_id: Indicator ID

        Returns:
            Localized action or None
        """
        translation = self.translations.get(indicator_id, {})
        return translation.get("action")

    def enrich_indicator(self, indicator_data: Dict) -> Dict:
        """
        Enrich indicator data with OBD codes and localization.

        This is where we add value beyond what OpenAI provides:
        - OBD diagnostic codes
        - Localized text (cheaper than API translation)
        - Urgency levels

        Args:
            indicator_data: Basic indicator data from AI

        Returns:
            Enriched indicator data
        """
        indicator_id = indicator_data.get("id", "")

        # Add OBD codes if available
        obd_codes = self.get_obd_codes(indicator_id)
        if obd_codes:
            indicator_data["obd_codes"] = obd_codes

        # Override with localized text if available
        localized_name = self.get_localized_name(indicator_id)
        if localized_name:
            indicator_data["name"] = localized_name

        localized_action = self.get_localized_action(indicator_id)
        if localized_action:
            indicator_data["action"] = localized_action

        # Add urgency if not set
        if "urgency" not in indicator_data or not indicator_data["urgency"]:
            indicator_data["urgency"] = self.get_urgency(indicator_id)

        return indicator_data

    def get_all_critical_indicators(self) -> List[str]:
        """
        Get list of all critical indicator IDs.

        Returns:
            List of indicator IDs with urgency >= 4
        """
        return [
            ind_id
            for ind_id, ind_data in self.indicators.items()
            if ind_data.get("urgency", 0) >= 4
        ]

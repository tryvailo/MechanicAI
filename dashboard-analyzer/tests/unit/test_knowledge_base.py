"""Unit tests for IndicatorKnowledgeBase."""

import pytest
from dashboard_analyzer.knowledge.indicators import IndicatorKnowledgeBase


def test_knowledge_base_initialization():
    """Test knowledge base initializes successfully."""
    kb = IndicatorKnowledgeBase(locale="en")
    assert kb.locale == "en"
    assert isinstance(kb.indicators, dict)
    assert isinstance(kb.translations, dict)


def test_get_obd_codes():
    """Test retrieving OBD codes for indicators."""
    kb = IndicatorKnowledgeBase(locale="en")
    
    # Test known indicator
    codes = kb.get_obd_codes("oil_pressure")
    assert isinstance(codes, list)
    assert len(codes) > 0
    assert "P0520" in codes or "P0521" in codes
    
    # Test unknown indicator
    codes = kb.get_obd_codes("unknown_indicator")
    assert codes == []


def test_get_urgency():
    """Test urgency level retrieval."""
    kb = IndicatorKnowledgeBase(locale="en")
    
    # Critical indicators should have high urgency
    urgency = kb.get_urgency("oil_pressure")
    assert urgency >= 4
    
    # Unknown indicator should return default
    urgency = kb.get_urgency("unknown")
    assert urgency == 3


def test_get_category():
    """Test category retrieval."""
    kb = IndicatorKnowledgeBase(locale="en")
    
    # Oil pressure is critical
    category = kb.get_category("oil_pressure")
    assert category == "critical"
    
    # Check engine is warning
    category = kb.get_category("check_engine")
    assert category == "warning"


def test_localization_english():
    """Test English localization."""
    kb = IndicatorKnowledgeBase(locale="en")
    
    name = kb.get_localized_name("oil_pressure")
    assert name is not None
    assert "oil" in name.lower() or "pressure" in name.lower()
    
    action = kb.get_localized_action("oil_pressure")
    assert action is not None
    assert "stop" in action.lower() or "check" in action.lower()


def test_localization_german():
    """Test German localization."""
    kb = IndicatorKnowledgeBase(locale="de")
    
    name = kb.get_localized_name("oil_pressure")
    assert name is not None
    # Should be German
    assert "öl" in name.lower() or "druck" in name.lower()


def test_localization_french():
    """Test French localization."""
    kb = IndicatorKnowledgeBase(locale="fr")
    
    name = kb.get_localized_name("oil_pressure")
    assert name is not None


def test_localization_russian():
    """Test Russian localization."""
    kb = IndicatorKnowledgeBase(locale="ru")
    
    name = kb.get_localized_name("oil_pressure")
    assert name is not None


def test_enrich_indicator(sample_indicator_data):
    """Test indicator enrichment with knowledge base."""
    kb = IndicatorKnowledgeBase(locale="en")
    
    enriched = kb.enrich_indicator(sample_indicator_data.copy())
    
    # Should have OBD codes added
    assert "obd_codes" in enriched
    assert len(enriched["obd_codes"]) > 0
    
    # Should have localized text
    assert "name" in enriched
    assert "action" in enriched


def test_get_critical_indicators():
    """Test retrieving all critical indicators."""
    kb = IndicatorKnowledgeBase(locale="en")
    
    critical = kb.get_all_critical_indicators()
    assert isinstance(critical, list)
    assert len(critical) > 0
    assert "oil_pressure" in critical
    assert "engine_temperature" in critical


def test_fallback_to_english_for_unknown_locale():
    """Test fallback to English for unsupported locale."""
    kb = IndicatorKnowledgeBase(locale="zh")  # Chinese not supported
    
    # Should fallback to English
    name = kb.get_localized_name("oil_pressure")
    assert name is not None

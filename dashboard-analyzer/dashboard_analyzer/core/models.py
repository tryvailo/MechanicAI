"""Pydantic models for dashboard analyzer."""

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class DashboardIndicator(BaseModel):
    """Dashboard indicator model."""

    id: str = Field(..., description="Unique indicator ID (e.g., 'oil_pressure')")
    symbol: str = Field(..., description="Symbol description")
    color: Literal["red", "yellow", "green", "blue", "white"]
    state: Literal["solid", "flashing"] = "solid"
    category: Literal["critical", "warning", "info"]

    # Localized fields
    name: str
    description: str
    action: str

    # Additional information
    urgency: int = Field(ge=1, le=5, description="Urgency level 1-5 (5 = critical)")
    related_indicators: Optional[List[str]] = None
    manufacturer_specific: Optional[dict] = None
    eu_compliance: Optional[dict] = None
    obd_codes: Optional[List[str]] = None


class AnalysisResult(BaseModel):
    """Result of dashboard image analysis."""

    type: Literal["dashboard", "damage", "tire"]

    # Dashboard specific
    indicators: Optional[List[DashboardIndicator]] = None
    critical_warnings: Optional[List[str]] = None

    # Common fields
    diagnosis: str
    severity: Literal["low", "medium", "high", "critical"]
    causes: List[str]
    recommendations: List[str]
    estimated_cost: Optional[dict] = None  # {"min": 100, "max": 500, "currency": "EUR"}

    # Metadata
    confidence: float = Field(ge=0.0, le=1.0, default=0.8)
    processing_time: float  # seconds
    provider_used: str
    timestamp: datetime = Field(default_factory=datetime.now)
    locale: str = "en"

    class Config:
        """Pydantic config."""

        json_schema_extra = {
            "example": {
                "type": "dashboard",
                "indicators": [
                    {
                        "id": "oil_pressure",
                        "symbol": "oil_can",
                        "color": "red",
                        "state": "solid",
                        "category": "critical",
                        "name": "Oil Pressure Warning",
                        "description": "Low engine oil pressure detected",
                        "action": "STOP immediately and check oil level",
                        "urgency": 5,
                        "obd_codes": ["P0520", "P0521"],
                    }
                ],
                "diagnosis": "Critical oil pressure warning detected",
                "severity": "critical",
                "causes": ["Low oil level", "Oil pump failure", "Oil leak"],
                "recommendations": [
                    "Stop the vehicle immediately",
                    "Check oil level",
                    "Contact mechanic if oil level is normal",
                ],
                "confidence": 0.95,
                "processing_time": 1.2,
                "provider_used": "openai",
                "locale": "en",
            }
        }

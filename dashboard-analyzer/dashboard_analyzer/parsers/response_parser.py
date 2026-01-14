"""Parser for AI response to structured data."""

import json
import logging
import re
from typing import Any, Dict, List

from ..core.exceptions import ParsingError


logger = logging.getLogger(__name__)


def parse_ai_response(text: str) -> Dict[str, Any]:
    """
    Parse AI response text to structured data.

    Attempts JSON parsing first, falls back to text parsing.

    Args:
        text: Raw text response from AI

    Returns:
        Parsed data dictionary

    Raises:
        ParsingError: If parsing fails completely
    """
    # Clean the text - remove markdown code blocks
    clean_text = text.strip()
    if clean_text.startswith("```json"):
        clean_text = re.sub(r"```json\n?", "", clean_text)
        clean_text = re.sub(r"```\n?$", "", clean_text)
    elif clean_text.startswith("```"):
        clean_text = re.sub(r"```\n?", "", clean_text)
        clean_text = re.sub(r"```\n?$", "", clean_text)

    # Try JSON parsing first
    try:
        return _parse_json(clean_text)
    except Exception as e:
        logger.warning(f"JSON parsing failed: {e}, trying text parsing")
        return _parse_text(clean_text)


def _parse_json(text: str) -> Dict[str, Any]:
    """
    Parse JSON from text.

    Args:
        text: Text containing JSON

    Returns:
        Parsed dictionary

    Raises:
        ParsingError: If JSON parsing fails
    """
    try:
        # Try to find JSON object in text
        json_match = re.search(r"\{[\s\S]*\}", text)
        if json_match:
            parsed = json.loads(json_match.group(0))

            # Normalize severity
            severity = parsed.get("severity", "medium")
            if isinstance(severity, str):
                severity = severity.lower()
                if severity not in ["low", "medium", "high", "critical"]:
                    severity = "medium"

            # Normalize causes
            causes = parsed.get("causes", [])
            if isinstance(causes, list):
                causes = [str(c) for c in causes if c][:10]
            else:
                causes = []

            # Normalize recommendations
            recommendations = parsed.get("recommendations", [])
            if isinstance(recommendations, list):
                recommendations = [str(r) for r in recommendations if r][:3]
            else:
                recommendations = []

            return {
                "type": parsed.get("photoType", "dashboard"),
                "diagnosis": parsed.get("diagnosis", text[:200]),
                "severity": severity,
                "causes": causes if causes else ["Unable to determine specific causes"],
                "recommendations": recommendations
                if recommendations
                else ["Consult with a professional mechanic"],
                "summary": parsed.get("summary", text[:200]),
                "dashboard_lights": parsed.get("dashboardLights", []),
                "damage_details": parsed.get("damageDetails"),
                "tire_details": parsed.get("tireDetails"),
                "estimated_cost": parsed.get("estimatedCost"),
            }
        else:
            raise ParsingError("No JSON object found in response")

    except json.JSONDecodeError as e:
        raise ParsingError(f"Invalid JSON: {e}") from e


def _parse_text(text: str) -> Dict[str, Any]:
    """
    Fallback text parsing when JSON fails.

    Args:
        text: Plain text response

    Returns:
        Parsed dictionary
    """
    logger.info("Using fallback text parsing")

    # Extract severity
    severity_match = re.search(r"severity[:\s]+(low|medium|high|critical)", text, re.I)
    severity = severity_match.group(1).lower() if severity_match else "medium"

    # Extract causes
    causes_match = re.search(
        r"(?:causes?|possible causes?)[:\s]+(.*?)(?:\n\n|recommendations|suggestions|summary|$)",
        text,
        re.DOTALL | re.I,
    )
    if causes_match:
        causes_text = causes_match.group(1)
        causes = [
            c.strip()
            for c in re.split(r"[•\-\n]", causes_text)
            if c.strip() and len(c.strip()) > 3
        ][:10]
    else:
        causes = []

    # Extract recommendations
    rec_match = re.search(
        r"(?:recommendations?|suggestions?)[:\s]+(.*?)(?:\n\n|summary|$)",
        text,
        re.DOTALL | re.I,
    )
    if rec_match:
        rec_text = rec_match.group(1)
        recommendations = [
            r.strip()
            for r in re.split(r"[•\-\n]", rec_text)
            if r.strip() and len(r.strip()) > 3
        ][:3]
    else:
        recommendations = []

    # Use first paragraph or first 200 chars as diagnosis
    diagnosis = text.split("\n\n")[0].strip() if "\n\n" in text else text[:200].strip()
    if not diagnosis:
        diagnosis = "Diagnosis unavailable"

    return {
        "type": "dashboard",
        "diagnosis": diagnosis,
        "severity": severity,
        "causes": causes if causes else ["Unable to determine specific causes from analysis"],
        "recommendations": recommendations
        if recommendations
        else ["Consult with a professional mechanic"],
        "summary": text[:200].strip() or "Summary unavailable",
    }

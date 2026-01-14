"""Basic usage example for dashboard-analyzer."""

import os
from dashboard_analyzer import DashboardAnalyzer

# Initialize analyzer
analyzer = DashboardAnalyzer(
    openai_api_key=os.getenv("OPENAI_API_KEY"),
    locale="en"  # English
)

# Analyze image from file
result = analyzer.analyze("path/to/dashboard.jpg")

# Print results
print(f"Analysis Type: {result.type}")
print(f"Severity: {result.severity}")
print(f"Diagnosis: {result.diagnosis}\n")

# Print detected indicators
if result.indicators:
    print(f"Detected {len(result.indicators)} indicator(s):")
    for ind in result.indicators:
        color_emoji = {
            "red": "🔴",
            "yellow": "🟡",
            "green": "🟢"
        }.get(ind.color, "⚪")

        print(f"\n{color_emoji} {ind.name} ({ind.color.upper()})")
        print(f"   Description: {ind.description}")
        print(f"   Action: {ind.action}")
        print(f"   Urgency: {ind.urgency}/5")

# Print recommendations
if result.recommendations:
    print("\nRecommendations:")
    for i, rec in enumerate(result.recommendations, 1):
        print(f"{i}. {rec}")

# Print processing info
print(f"\nProcessing time: {result.processing_time:.2f}s")
print(f"Provider: {result.provider_used}")
print(f"Confidence: {result.confidence:.0%}")

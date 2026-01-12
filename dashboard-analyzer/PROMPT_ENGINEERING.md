# Prompt Engineering Guide

## System Prompt Architecture

The system prompt is the **most critical component** - it determines recognition quality.

### Design Philosophy

```
┌─────────────────────────────────────────────┐
│         System Prompt (300+ lines)          │
│                                             │
│  1. Role Definition                         │
│  2. Analysis Protocol (4 steps)             │
│  3. Indicator Reference Guide               │
│  4. Response Format (JSON schema)           │
│  5. Quality Checklist                       │
│  6. Few-Shot Example                        │
└─────────────────────────────────────────────┘
```

## Structure Breakdown

### 1. Role Definition

```
You are an expert automotive diagnostics AI specialized in European vehicle dashboard analysis.
```

**Why:**
- Sets clear expertise boundaries
- Focuses on European market
- Establishes authority

### 2. Analysis Protocol (Step-by-Step)

```
Step 1: IDENTIFY - Scan systematically
Step 2: CATEGORIZE - Red/Yellow/Green
Step 3: ANALYZE - Look for combinations
Step 4: DIAGNOSE - Explain and recommend
```

**Why:**
- Ensures systematic approach
- Reduces missed indicators
- Improves consistency

### 3. Comprehensive Reference Guide

#### Critical (RED) Indicators

Each indicator has:
- **Symbol description** - How it looks
- **Meaning** - What's wrong
- **Action** - What to do NOW
- **Causes** - Why it happens
- **Risk** - Consequences if ignored
- **European Notes** - TÜV/MOT implications
- **Cost Estimates** - In EUR

Example:
```
**Oil Pressure Warning**
Symbol: Oil can, sometimes with drop or wavy lines
Meaning: Insufficient oil pressure to lubricate engine
Action: STOP IMMEDIATELY. Turn off engine. Check oil level.
Causes: Low oil, pump failure, leak, worn bearings
Risk: Engine seizure within minutes
European Notes: Immediate TÜV/MOT fail
```

### 4. Strict JSON Format

```json
{
  "photoType": "dashboard",
  "diagnosis": "...",
  "severity": "critical|high|medium|low",
  "causes": [...],
  "recommendations": [...],
  "summary": "...",
  "dashboardLights": [
    {
      "symbol": "oil_can",
      "color": "red",
      "meaning": "...",
      "action": "..."
    }
  ]
}
```

**Why:**
- Parseable by code
- Structured data extraction
- Consistent format

### 5. Severity Assessment Rules

Clear guidelines:
- **critical** - Red, requires immediate stop
- **high** - Red but drivable, safety risk
- **medium** - Yellow, schedule service
- **low** - Info, minor issues

### 6. Quality Checklist

Before AI responds, it must verify:
- ☑ All indicators identified
- ☑ Colors accurate
- ☑ Severity correct
- ☑ JSON valid
- ☑ European context
- ☑ Costs in EUR

### 7. Few-Shot Example

Provides concrete example:
- Input description
- Expected JSON output
- Shows quality standard

## European Market Specifics

### Units
- ✅ km/h, liters
- ❌ mph, gallons

### Currency
- ✅ EUR (€)
- ❌ USD ($)

### Regulations
- TÜV (Germany)
- MOT (UK)
- Contrôle Technique (France)
- ITV (Spain)
- APK (Netherlands)

### Manufacturer Focus
- VW, BMW, Mercedes, Audi
- Renault, Peugeot, Citroën
- Volvo, Fiat, Alfa Romeo

## Cost Estimation Guidelines

Realistic EUR prices:
```
- Diagnostic scan: €50-100
- Oil change: €80-150
- Brake pads: €150-300
- DPF cleaning: €200-400
- DPF replacement: €1500-2500
- Head gasket: €1500-3000
```

## Prompt Optimization Techniques

### 1. Structured Instructions

❌ **Bad:**
"Analyze the dashboard"

✅ **Good:**
```
Step 1: IDENTIFY ALL ILLUMINATED INDICATORS
Scan the entire dashboard systematically:
- Start from left to right
- Top row first, then lower sections
- Note EVERY lit indicator, even small ones
```

### 2. Specific Examples

❌ **Bad:**
"Identify warning lights"

✅ **Good:**
```
**Oil Pressure Warning**
Symbol: Oil can, sometimes with drop or wavy lines
Meaning: Insufficient oil pressure to lubricate engine
Action: STOP IMMEDIATELY. Turn off engine.
```

### 3. Clear Format

❌ **Bad:**
"Return JSON"

✅ **Good:**
```
CRITICAL: Always respond with valid JSON in this EXACT format:
{
  "photoType": "dashboard",
  "diagnosis": "...",
  ...
}
```

### 4. Context-Specific Knowledge

❌ **Bad:**
"Check engine light"

✅ **Good:**
```
**Check Engine Light / MIL**
State: 
  - SOLID → Schedule diagnostic, not urgent
  - FLASHING → Misfire, reduce speed NOW
European Notes: MOT/CT fail if solid during test
OBD Required: Yes, must read codes
```

## Customization Guide

### Adding New Indicator

```python
**Indicator Name**
Symbol: [Visual description]
Meaning: [What it indicates]
Action: [Immediate action required]
Causes: [Common causes]
Risk: [What happens if ignored]
European Notes: [TÜV/MOT implications]
Cost: [Repair cost in EUR]
```

### Adding Manufacturer-Specific

```python
**Manufacturer Name:**
- Symbol → Meaning
- Symbol → Meaning
- Special note
```

### Modifying Response Format

Edit JSON schema in RESPONSE FORMAT section:
```python
"dashboardLights": [
  {
    "symbol": "...",
    "color": "...",
    "meaning": "...",
    "action": "...",
    // Add new field here
    "obd_code": "..."
  }
]
```

## Prompt Length Considerations

**Current:** ~300 lines, ~2500 tokens

**Trade-offs:**
- ✅ More context = Better accuracy
- ✅ Detailed examples = Consistent output
- ❌ Longer prompt = Higher cost per request
- ❌ More tokens = Slower response

**Optimization:**
- Keep critical safety info (RED indicators)
- Detail for manufacturer-specific (VAG, BMW)
- Abbreviate green/blue (less important)

## Testing Prompt Changes

### Before Deployment

1. **Unit Test with Mock:**
```python
def test_prompt_structure():
    assert "CRITICAL" in CAR_DIAGNOSTICS_SYSTEM_PROMPT
    assert "JSON" in CAR_DIAGNOSTICS_SYSTEM_PROMPT
    assert "€" in CAR_DIAGNOSTICS_SYSTEM_PROMPT  # EUR symbol
```

2. **Integration Test with Real Images:**
```python
result = analyzer.analyze("test_dashboard_oil_warning.jpg")
assert result.severity == "critical"
assert any("oil" in ind.name.lower() for ind in result.indicators)
```

3. **Manual Review:**
- Test with various dashboard photos
- Verify JSON validity
- Check severity accuracy
- Validate European context

## Best Practices

### ✅ DO

- Use systematic step-by-step instructions
- Provide concrete examples (few-shot)
- Include safety-critical details
- Specify exact JSON format
- Add quality checklist
- Use European units/currency
- Include manufacturer specifics

### ❌ DON'T

- Use vague instructions
- Skip severity guidelines
- Forget JSON schema
- Mix US/EU units
- Ignore edge cases
- Omit cost estimates

## Prompt Versioning

Track changes:
```python
# Version 1.0 - Initial (from TypeScript)
# Version 2.0 - Enhanced with European focus
# Version 2.1 - Added manufacturer-specific
# Version 2.2 - Improved severity rules
```

## Performance Metrics

Monitor:
- **Accuracy:** % correct indicator identification
- **Completeness:** % of all indicators found
- **JSON validity:** % parseable responses
- **Severity accuracy:** % correct critical/high/medium/low
- **Cost per analysis:** Tokens × price

## Localization Strategy

User prompt adds locale hint:
```python
"IMPORTANT: User speaks German. Provide localized field names in German where applicable."
```

**Why not in system prompt:**
- System prompt is static (same for all)
- User prompt is dynamic (per request)
- Keeps system prompt language-agnostic

## Future Improvements

- [ ] Add more manufacturer-specific indicators
- [ ] Include OBD-II code examples
- [ ] Expand few-shot examples (2-3 scenarios)
- [ ] Add image quality assessment
- [ ] Include partial/unclear indicator handling

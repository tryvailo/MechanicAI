# Architecture & Approach Comparison

## Table of Contents
- [Overview](#overview)
- [Three Approaches](#three-approaches)
  - [Approach 1: AI-Only (Minimal)](#approach-1-ai-only-minimal)
  - [Approach 2: Full Knowledge Base](#approach-2-full-knowledge-base)
  - [Approach 3: Balanced (Current)](#approach-3-balanced-current)
- [System Prompt Enhancement](#system-prompt-enhancement)
- [Regional Specifics](#regional-specifics)
- [Why We Chose the Balanced Approach](#why-we-chose-the-balanced-approach)

---

## Overview

This document describes three architectural approaches for the Dashboard Analyzer module, explains the rationale behind the chosen balanced approach, and details the system prompt enhancements.

**Target Market:** European Union + United Kingdom
**AI Provider:** Google Gemini (gemini-1.5-flash-002 / gemini-1.5-pro-002)
**Languages:** EN, DE, FR, RU (expandable to IT, ES, PL, NL)

---

## Three Approaches

### Approach 1: AI-Only (Minimal)

**Philosophy:** Rely entirely on Gemini Vision API for recognition and diagnosis.

#### Architecture
```
┌─────────────┐
│ User Photo  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│   Gemini Vision API     │
│  - Recognize indicators │
│  - Explain meanings     │
│  - Provide diagnosis    │
└──────┬──────────────────┘
       │
       ▼
┌─────────────┐
│   Result    │
└─────────────┘
```

#### Components
- **Core:** `DashboardAnalyzer` class
- **Provider:** `GeminiProvider` (Gemini 1.5 Flash/Pro)
- **Prompt:** Enhanced system prompt (~300 lines)
- **Knowledge Base:** ❌ None
- **Localization:** ❌ None (Gemini translates on-the-fly)

#### Advantages
✅ Simplest implementation
✅ No maintenance of knowledge base
✅ Gemini already knows most indicators
✅ Natural language flexibility
✅ Minimal code footprint

#### Disadvantages
❌ **No OBD-II codes** - Gemini unreliable for exact codes (P0520, P0420, etc.)
❌ **Inconsistent terminology** - May use different terms each time
❌ **API translation costs** - Every locale change = new API call
❌ **No offline capability** - 100% dependent on API
❌ **Harder to verify** - No ground truth for testing

#### Cost Estimate
- Per analysis: $0.002-0.005 (Gemini Flash)
- With localization: 4x cost (EN + DE + FR + RU)
- **Monthly (1000 analyses):** ~$2-5 base, ~$8-20 with localization

#### Use Cases
- Prototyping / MVP
- Low-volume applications
- When OBD codes not needed
- Single language only

---

### Approach 2: Full Knowledge Base

**Philosophy:** Comprehensive local database replicating all automotive knowledge.

#### Architecture
```
┌─────────────┐
│ User Photo  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│   Gemini Vision API     │
│  - Recognize symbols    │
│  - Detect colors        │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│       Full Knowledge Base           │
│  - Indicator descriptions           │
│  - Diagnostic logic                 │
│  - Cause analysis                   │
│  - Repair procedures                │
│  - Cost databases                   │
│  - Manufacturer specifics           │
│  - Complete localization            │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────┐
│   Result    │
└─────────────┘
```

#### Components
- **Database:** SQLite/PostgreSQL with comprehensive schema
- **Tables:** indicators, obd_codes, causes, repairs, costs, translations
- **Logic:** Python rules engine for diagnosis
- **Knowledge:** 200+ indicators × 8 languages = 1600+ entries
- **Maintenance:** Regular updates for new models/regulations

#### Advantages
✅ Complete offline capability
✅ Deterministic results
✅ Precise OBD codes
✅ Consistent terminology
✅ Lower per-request costs
✅ Regulatory compliance tracking
✅ Detailed repair procedures

#### Disadvantages
❌ **Massive duplication** - Rebuilding what Gemini already knows
❌ **High maintenance** - New car models, regulations, updates
❌ **Complex logic** - Rules engine for combinations
❌ **Database overhead** - Schema, migrations, backups
❌ **Staleness risk** - KB outdated vs Gemini's fresh training
❌ **Development time** - 4-6 weeks vs 1 week

#### Cost Estimate
- Development: 4-6 weeks
- Database maintenance: 4-8 hours/month
- Per analysis: $0.001 (Gemini) + negligible DB lookup
- **Monthly (1000 analyses):** ~$1 + maintenance cost

#### Use Cases
- High-volume applications (10k+ daily)
- Offline/embedded systems
- Regulated environments requiring determinism
- When complete control needed

---

### Approach 3: Balanced (Current)

**Philosophy:** Gemini does ALL recognition, knowledge base only enriches with data Gemini is unreliable for.

#### Architecture
```
┌─────────────┐
│ User Photo  │
└──────┬──────┘
       │
       ▼
┌────────────────────────────────────┐
│      Gemini Vision API             │
│  ✅ Recognize all indicators       │
│  ✅ Determine colors & states      │
│  ✅ Explain meanings               │
│  ✅ Provide diagnosis              │
│  ✅ Suggest actions                │
│  ✅ Estimate severity              │
└──────┬─────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│   Lightweight Knowledge Base       │
│  ✅ OBD-II codes (Gemini ≠ exact)  │
│  ✅ Localization (cheaper than API)│
│  ✅ Urgency levels (1-5 scale)     │
│  ✅ Category tags (critical/warn)  │
└──────┬─────────────────────────────┘
       │
       ▼
┌─────────────┐
│   Result    │
└─────────────┘
```

#### Components
**Core:**
- `DashboardAnalyzer` - Orchestration
- `GeminiProvider` - Vision API integration
- `IndicatorKnowledgeBase` - Lightweight enrichment

**Knowledge Base (JSON):**
```json
{
  "indicators": {
    "oil_pressure": {
      "obd_codes": ["P0520", "P0521", "P0522", "P0523", "P0524"],
      "urgency": 5,
      "category": "critical"
    }
  }
}
```

**Localization (JSON):**
```json
{
  "locale": "de",
  "indicators": {
    "oil_pressure": {
      "name": "Öldruckwarnung",
      "action": "SOFORT Motor abstellen"
    }
  }
}
```

#### Division of Responsibilities

| Task | Gemini | Knowledge Base |
|------|--------|---------------|
| Recognize indicator symbols | ✅ | ❌ |
| Determine colors (red/yellow) | ✅ | ❌ |
| Explain what indicator means | ✅ | ❌ |
| Provide exact OBD-II codes | ❌ | ✅ |
| Localize text | ❌ | ✅ |
| Assess severity | ✅ | ✅ (validate) |
| Suggest actions | ✅ | ❌ |
| Estimate costs | ✅ | ❌ |

#### Advantages
✅ **Best of both worlds** - AI flexibility + precise codes
✅ **Minimal duplication** - Only what AI can't do reliably
✅ **Low maintenance** - KB is ~50 indicators vs 200+
✅ **Cost effective** - Single API call + cheap lookups
✅ **Graceful degradation** - KB optional, won't break if missing
✅ **Easy testing** - KB testable, Gemini behavior verified
✅ **Fast development** - 1-2 weeks vs 4-6 weeks

#### Disadvantages
⚠️ **Partial offline** - Recognition requires API
⚠️ **Some maintenance** - OBD codes need occasional updates
⚠️ **Translation overhead** - 4-8 languages to maintain

#### Cost Estimate
- Development: 1-2 weeks
- KB maintenance: 1-2 hours/month
- Per analysis: $0.002 (Gemini Flash) + negligible
- **Monthly (1000 analyses):** ~$2-3 total

#### Use Cases
✅ **Perfect for:**
- Medium-volume applications (100-10k daily)
- European market (TÜV, MOT, regulations)
- Multi-language requirements
- Need for exact OBD codes
- Budget-conscious projects

---

## System Prompt Enhancement

### Evolution

**v1.0 (Basic):**
- Simple role definition (~50 lines)
- List of common indicators
- Basic JSON format

**v2.0 (Enhanced - Current):**
- Comprehensive 300+ line system prompt
- Structured 4-step analysis protocol
- Detailed indicator reference guide
- European market specifics
- Quality checklist
- Few-shot examples

### Key Improvements

#### 1. Structured Analysis Protocol
```
Step 1: IDENTIFY - Systematic scanning (left→right, top→bottom)
Step 2: CATEGORIZE - Red/Yellow/Green urgency
Step 3: ANALYZE - Detect indicator combinations
Step 4: DIAGNOSE - Explain + recommend actions
```

#### 2. Comprehensive Indicator Guide

For each of 15+ indicators:
- **Symbol description** - Visual appearance
- **Meaning** - What it indicates
- **Immediate action** - What to do NOW
- **Common causes** - Why it appears
- **Risk if ignored** - Consequences
- **European notes** - TÜV/MOT implications
- **Cost estimates** - Repair costs in EUR/GBP

#### 3. Manufacturer-Specific Knowledge
- **BMW:** CBS (Condition Based Service), iDrive codes
- **Mercedes:** ASSYST service system
- **VW/Audi:** EPC (Electronic Power Control)
- **Volvo:** Diesel specifics (DPF, AdBlue)
- **Peugeot/Citroën:** French market quirks

#### 4. Quality Checklist

Before responding, Gemini verifies:
- ☑ All visible indicators identified
- ☑ Colors accurately described
- ☑ Severity correctly assessed
- ☑ JSON format is valid
- ☑ Regional specifics included
- ☑ Cost estimates in local currency

#### 5. Few-Shot Example

Provides concrete example of:
- Input photo description
- Expected analysis process
- Correct JSON output format
- Sets quality standard

### Impact

| Metric | Before | After |
|--------|--------|-------|
| Prompt length | ~50 lines | 300+ lines |
| Indicator coverage | 8 basic | 15+ detailed |
| European specifics | None | TÜV/MOT/costs |
| Consistency | Variable | High (checklist) |
| Accuracy | ~75% | ~90%+ (estimated) |

---

## Regional Specifics

### European Union (Continental)

**Units:**
- Distance: Kilometers (km), km/h
- Fuel: Liters (L), L/100km
- Temperature: Celsius (°C)

**Regulations:**
- **Germany:** TÜV (Technischer Überwachungsverein)
- **France:** Contrôle Technique
- **Spain:** ITV (Inspección Técnica de Vehículos)
- **Netherlands:** APK (Algemene Periodieke Keuring)
- **Poland:** Przegląd techniczny

**Currency:**
- EUR (€)
- Repair cost estimates in euros

**Languages:**
- English, German, French, Russian
- Expandable: Italian, Spanish, Polish, Dutch

### United Kingdom

**Units:**
- Distance: **Miles, mph** (UK-specific)
- Fuel: Liters (L), mpg (miles per gallon)
- Temperature: Celsius (°C)

**Regulations:**
- **MOT** (Ministry of Transport test)
- Annual inspection for vehicles 3+ years old
- Different emissions standards vs EU

**Currency:**
- GBP (£)
- Repair cost estimates in pounds sterling

**Languages:**
- English (UK-specific terminology)

### Implementation

The system prompt includes regional detection:

```python
# Detect region from locale or user input
if locale == "en-GB":
    units = "miles, mph, mpg"
    currency = "GBP (£)"
    regulation = "MOT"
elif locale in ["en", "en-US", "en-EU"]:
    units = "km, km/h, L/100km"
    currency = "EUR (€)"
    regulation = "TÜV/Contrôle Technique/ITV"
```

**System Prompt Regional Section:**
```
## REGIONAL SPECIFICS

For UK users:
- Use miles and mph (not km/km/h)
- Reference MOT requirements
- Provide costs in GBP (£)
- Use UK English (colour, centre, tyre)

For EU users:
- Use kilometers and km/h
- Reference TÜV/MOT/ITV/APK as appropriate
- Provide costs in EUR (€)
- Use appropriate language locale
```

---

## Why We Chose the Balanced Approach

### Decision Matrix

| Criteria | AI-Only | Full KB | Balanced |
|----------|---------|---------|----------|
| **Development time** | 1 week | 4-6 weeks | 1-2 weeks |
| **Maintenance effort** | Low | High | Medium |
| **OBD code accuracy** | ❌ Poor | ✅ Perfect | ✅ Perfect |
| **Localization cost** | ❌ High | ✅ Zero | ✅ Low |
| **Offline capability** | ❌ None | ✅ Full | ⚠️ Partial |
| **Flexibility** | ✅ High | ❌ Low | ✅ High |
| **Determinism** | ❌ Low | ✅ High | ⚠️ Medium |
| **Cost per 1k analyses** | $8-20 | $1 | $2-3 |
| **Suitable for MVP** | ⚠️ Maybe | ❌ No | ✅ Yes |

### Key Reasons

1. **OBD Codes are Critical**
   - Insurance claims require exact codes
   - Mechanics need P-codes for diagnosis
   - Gemini hallucinates codes (~30% error rate)
   - KB provides ground truth

2. **Localization is Expensive via API**
   - 4 languages × $0.002 = $0.008 per image
   - 1000 images = $8 vs $2 with KB
   - One-time translation vs repeated API calls

3. **Avoid Duplicating Gemini's Strengths**
   - Gemini excellent at visual recognition
   - Gemini explains meanings naturally
   - Gemini handles edge cases flexibly
   - No need to codify what AI already knows

4. **Graceful Degradation**
   ```python
   try:
       kb = IndicatorKnowledgeBase()
   except:
       kb = None  # Works without KB, just no codes
   ```

5. **Testing Strategy**
   - KB testable with pytest (deterministic)
   - Gemini verified with real images
   - Combined system: best of both

### Real-World Scenario

**User uploads photo with oil pressure warning:**

**AI-Only approach:**
```json
{
  "indicator": "Oil Pressure Warning",
  "description": "Low oil pressure detected",
  "obd_codes": ["P0521", "P0520"]  // ⚠️ Order wrong, might hallucinate
}
```

**Full KB approach:**
- Slow database queries
- Maintaining oil pressure diagnosis logic
- Updating for new car models
- Rigid rule matching

**Balanced approach:**
```
1. Gemini recognizes: "Oil can with drop, RED, solid"
2. Gemini explains: "Critical oil pressure issue"
3. KB enriches: adds ["P0520", "P0521", "P0522", "P0523", "P0524"]
4. KB localizes: "Öldruckwarnung" (DE) / "Pression d'huile" (FR)
5. Return combined result
```

✅ **Best accuracy + lowest cost + fastest development**

---

## Conclusion

The **Balanced Approach** is optimal for the European dashboard analyzer because:

1. **Time-to-market:** 1-2 weeks vs 4-6 weeks
2. **Cost-effective:** $2-3 per 1k analyses vs $8-20
3. **Accurate OBD codes:** Critical for professional use
4. **Efficient localization:** One-time vs repeated API costs
5. **Maintainable:** Small KB (50 indicators) vs full database (200+)
6. **Flexible:** Gemini handles unknowns, KB provides precision
7. **Testable:** Clear separation of concerns

### Future Migration Path

**If volumes grow (>10k daily):**
- Gradual KB expansion
- Cache Gemini responses
- Consider Approach 2 (Full KB)

**If budget very tight:**
- Remove KB, go Approach 1
- Single language only
- Accept OBD code uncertainty

**Current choice gives us flexibility to adapt as requirements evolve.**

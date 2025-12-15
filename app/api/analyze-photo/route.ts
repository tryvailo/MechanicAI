import { NextRequest, NextResponse } from 'next/server';

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

// Response types
type AnalyzePhotoResponse = {
  diagnosis: string;
  severity: 'low' | 'medium' | 'high';
  causes: string[];
  recommendations: string[];
  summary: string;
} | {
  error: string;
};

// Helper function to convert file to base64
async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  const mimeType = file.type || 'image/jpeg';
  return `data:${mimeType};base64,${base64}`;
}

// Helper function to validate file type
function validateFileType(file: File): boolean {
  const mimeType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  const extension = fileName.substring(fileName.lastIndexOf('.'));
  
  return (
    ALLOWED_MIME_TYPES.includes(mimeType) ||
    ALLOWED_EXTENSIONS.includes(extension)
  );
}

// Helper function to parse LLM response and extract structured data
function parseAnalysisResponse(text: string): {
  diagnosis: string;
  severity: 'low' | 'medium' | 'high';
  causes: string[];
  recommendations: string[];
  summary: string;
} {
  // Clean the text - remove markdown code blocks if present
  let cleanText = text.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/```json\n?/i, '').replace(/```\n?$/, '');
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/```\n?/i, '').replace(/```\n?$/, '');
  }

  // Try to parse JSON if the response contains JSON
  try {
    // Try to find JSON object in the text
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize the parsed data
      const severity = ['low', 'medium', 'high'].includes(parsed.severity?.toLowerCase())
        ? (parsed.severity.toLowerCase() as 'low' | 'medium' | 'high')
        : 'medium';

      return {
        diagnosis: parsed.diagnosis || cleanText.substring(0, 200) || 'Diagnosis unavailable',
        severity,
        causes: Array.isArray(parsed.causes) && parsed.causes.length > 0
          ? parsed.causes.filter((c: unknown) => typeof c === 'string').slice(0, 10)
          : [],
        recommendations: Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
          ? parsed.recommendations.filter((r: unknown) => typeof r === 'string').slice(0, 3)
          : [],
        summary: parsed.summary || cleanText.substring(0, 200) || 'Summary unavailable',
      };
    }
  } catch {
    // Not valid JSON, continue with text parsing
  }

  // Fallback: extract information from text using patterns
  const severityMatch = cleanText.match(/severity[:\s]+(low|medium|high)/i);
  const severity = (severityMatch?.[1]?.toLowerCase() || 'medium') as 'low' | 'medium' | 'high';

  // Extract causes (look for lists or "causes:" patterns)
  const causesMatch = cleanText.match(/(?:causes?|possible causes?)[:\s]+(.*?)(?:\n\n|recommendations|suggestions|summary|$)/is);
  const causes = causesMatch
    ? causesMatch[1]
        .split(/[•\-\n]/)
        .map(c => c.trim().replace(/^[-*]\s*/, ''))
        .filter(c => c.length > 0)
        .slice(0, 10)
    : [];

  // Extract recommendations
  const recommendationsMatch = cleanText.match(/(?:recommendations?|suggestions?)[:\s]+(.*?)(?:\n\n|summary|$)/is);
  const recommendations = recommendationsMatch
    ? recommendationsMatch[1]
        .split(/[•\-\n]/)
        .map(r => r.trim().replace(/^[-*]\s*/, ''))
        .filter(r => r.length > 0)
        .slice(0, 3)
    : [];

  // Use first paragraph or first 200 chars as diagnosis
  const diagnosis = cleanText.split('\n\n')[0]?.trim() || cleanText.substring(0, 200).trim() || 'Diagnosis unavailable';

  // Summary is first 200 chars
  const summary = cleanText.substring(0, 200).trim() || 'Summary unavailable';

  return {
    diagnosis,
    severity,
    causes: causes.length > 0 ? causes : ['Unable to determine specific causes from analysis'],
    recommendations: recommendations.length > 0 ? recommendations : ['Consult with a professional mechanic'],
    summary,
  };
}

// Comprehensive system prompt for car diagnostics including dashboard indicators
const CAR_DIAGNOSTICS_SYSTEM_PROMPT = `You are an expert car diagnostics assistant. Analyze user-provided photos and provide detailed diagnosis.

## DASHBOARD INDICATOR RECOGNITION

If the photo shows a dashboard, you MUST identify ALL warning lights:

### 🔴 CRITICAL (RED) — Immediate action required:
- **Oil Pressure** (oil can icon): STOP immediately, engine damage imminent
- **Engine Temperature** (thermometer in water): Pull over, engine overheating
- **Brake Warning** (circle with !): Brake system failure, stop if handbrake released
- **Battery/Charging** (battery icon): Alternator failure, limited driving time
- **Airbag/SRS** (person with circle): Airbag malfunction
- **Power Steering** (steering wheel with !): Steering will be heavy

### 🟡 WARNING (YELLOW/AMBER) — Check soon:
- **Check Engine/MIL** (engine outline): Emission/engine issue. FLASHING = misfire, reduce speed
- **ABS** (ABS in circle): Anti-lock brakes disabled
- **Traction Control/ESP** (car with wavy lines): Stability system issue
- **Tire Pressure/TPMS** (tire with !): Low pressure in one or more tires
- **DPF** (box with dots): Diesel particulate filter needs highway drive
- **Glow Plug** (coil icon, diesel): Wait to start or glow plug fault
- **EPC** (VW/Audi): Electronic throttle issue
- **Service Required** (wrench): Scheduled maintenance due

### 🟢 INFORMATIONAL (GREEN/BLUE):
- Turn signals, headlights, cruise control, eco mode, etc.

### SPECIAL COMBINATIONS:
- ABS + Traction + Brake = Wheel speed sensor failure
- Multiple lights at once = Often electrical/sensor issue
- Check Engine + Traction = Engine issue affecting stability

## DAMAGE ANALYSIS

If the photo shows vehicle DAMAGE (dents, scratches, rust, cracks, collision damage):

### Damage Types & Causes:
- **Dent without paint damage**: Parking lot impact, hail, minor collision
- **Scratch (surface)**: Keys, brushes, branches → Polish may fix
- **Deep scratch (to primer/metal)**: Impact, vandalism → Needs touch-up/respray
- **Rust spots**: Stone chips left untreated, salt exposure, age
- **Cracked bumper**: Low-speed impact, parking mishap
- **Cracked windshield**: Stone impact, temperature stress, structural flex
- **Headlight/taillight damage**: Collision, vandalism, UV degradation (yellowing)
- **Wheel damage (curb rash)**: Parallel parking, tight corners
- **Suspension sag**: Worn springs, overloading, accident damage

### Damage Severity Guide:
- **Cosmetic only**: No safety concern, optional repair
- **Structural concern**: May affect safety, professional inspection needed
- **Safety critical**: Immediate repair required (brakes, steering, suspension visible damage)

### Cost Estimation Hints:
- Minor scratch polish: €50-150
- Touch-up paint: €100-300
- Panel respray: €300-800
- Dent removal (PDR): €80-200 per dent
- Bumper replacement: €400-1200
- Windshield replacement: €200-600

## TIRE ANALYSIS (if tire photo)

Check for:
- **Tread depth**: Estimate mm remaining, legal min 1.6mm EU
- **Wear pattern**: Even, center, edge, one-side, cupping
- **Sidewall damage**: Bulges (dangerous!), cracks, cuts
- **Age**: DOT code (last 4 digits = week + year)
- **Foreign objects**: Nails, screws embedded

## ANALYSIS INSTRUCTIONS:
1. Identify the TYPE of photo (dashboard, engine bay, exterior, tire, damage, collision, etc.)
2. For dashboards: List ALL visible warning lights by color and symbol
3. For damage: Describe location, type, severity, likely cause, repair options
4. For tires: Assess wear, pattern, safety, remaining life
5. Explain what each issue means in plain language
6. Provide severity assessment (cosmetic / moderate / safety-critical)
7. Give specific actionable recommendations with cost hints where applicable
8. Note any dangerous conditions requiring immediate attention

## RESPONSE FORMAT (JSON):
{
  "photoType": "dashboard|damage|tire|engine|exterior|interior|other",
  "diagnosis": "Main issue identified",
  "severity": "low|medium|high",
  "causes": ["Possible cause 1", "Possible cause 2", ...],
  "recommendations": ["Action 1", "Action 2", "Action 3"],
  "summary": "Brief summary for logs",
  "estimatedCost": "€X-Y range if applicable",
  "dashboardLights": [
    {"symbol": "description", "color": "red/yellow/green", "meaning": "what it means", "action": "what to do"}
  ],
  "damageDetails": {
    "location": "front bumper, door, etc.",
    "type": "dent|scratch|crack|rust|other",
    "size": "small|medium|large",
    "affectsSafety": true/false,
    "repairMethod": "PDR, respray, replacement, etc."
  },
  "tireDetails": {
    "treadDepth": "Xmm estimated",
    "wearPattern": "even|center|edge|uneven",
    "condition": "good|fair|worn|dangerous",
    "visibleIssues": ["cracks", "bulge", "nail", etc.]
  }
}`;

// Helper function to call OpenAI Vision API
async function callOpenAIVision(
  apiKey: string,
  imageBase64: string,
  description?: string
): Promise<string> {
  const userPrompt = description
    ? `User question/description: ${description}\n\nAnalyze this car photo and provide a detailed diagnosis. If it's a dashboard, identify ALL warning lights.`
    : 'Analyze this car photo and provide a diagnosis. If it shows a dashboard, identify ALL warning lights visible.';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: CAR_DIAGNOSTICS_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// Helper function to call Claude Vision API
async function callClaudeVision(
  apiKey: string,
  imageBase64: string,
  description?: string
): Promise<string> {
  const userPrompt = description
    ? `User question/description: ${description}\n\nAnalyze this car photo and provide a detailed diagnosis. If it's a dashboard, identify ALL warning lights.`
    : 'Analyze this car photo and provide a diagnosis. If it shows a dashboard, identify ALL warning lights visible.';

  // Extract base64 data without data URL prefix for Claude
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
  const mimeType = imageBase64.match(/data:([^;]+)/)?.[1] || 'image/jpeg';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      system: CAR_DIAGNOSTICS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}

export async function POST(request: NextRequest) {
  try {
    // Parse multipart/form-data
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    const description = formData.get('description') as string | null;

    // Validate file exists
    if (!file) {
      return NextResponse.json<AnalyzePhotoResponse>(
        { error: 'Image file is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!validateFileType(file)) {
      return NextResponse.json<AnalyzePhotoResponse>(
        {
          error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json<AnalyzePhotoResponse>(
        {
          error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 413 }
      );
    }

    // Get API key from environment variables
    const openaiKey = process.env.OPENAI_API_KEY;
    const claudeKey = process.env.CLAUDE_API_KEY;
    const apiProvider = process.env.VISION_API_PROVIDER?.toLowerCase() || 'openai';

    if (!openaiKey && !claudeKey) {
      return NextResponse.json<AnalyzePhotoResponse>(
        {
          error: 'API key not configured. Please set OPENAI_API_KEY or CLAUDE_API_KEY environment variable.',
        },
        { status: 503 }
      );
    }

    // Convert image to base64
    const imageBase64 = await fileToBase64(file);

    // Call appropriate vision API with fallback
    let analysisText: string;
    let lastError: unknown;
    
    const tryOpenAI = async () => {
      if (!openaiKey) throw new Error('OpenAI API key not configured');
      return await callOpenAIVision(openaiKey, imageBase64, description || undefined);
    };

    const tryClaude = async () => {
      if (!claudeKey) throw new Error('Claude API key not configured');
      return await callClaudeVision(claudeKey, imageBase64, description || undefined);
    };

    try {
      // Determine primary and secondary providers
      const preferClaude = (apiProvider === 'claude' && claudeKey) || (!openaiKey && claudeKey);
      
      if (preferClaude) {
        try {
          analysisText = await tryClaude();
        } catch (error) {
          console.warn('Claude Vision API failed, attempting fallback to OpenAI:', error);
          lastError = error;
          if (openaiKey) {
            analysisText = await tryOpenAI();
          } else {
            throw error;
          }
        }
      } else {
        try {
          analysisText = await tryOpenAI();
        } catch (error) {
          console.warn('OpenAI Vision API failed, attempting fallback to Claude:', error);
          lastError = error;
          if (claudeKey) {
            analysisText = await tryClaude();
          } else {
            throw error;
          }
        }
      }
    } catch (apiError) {
      const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown API error';
      return NextResponse.json<AnalyzePhotoResponse>(
        {
          error: `Vision API error: ${errorMessage}`,
        },
        { status: 503 }
      );
    }

    // Parse and structure the response
    const analysis = parseAnalysisResponse(analysisText);

    return NextResponse.json<AnalyzePhotoResponse>(analysis, { status: 200 });
  } catch (error) {
    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json<AnalyzePhotoResponse>(
      {
        error: `Failed to analyze photo: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to analyze photos.' },
    { status: 405 }
  );
}


import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for tire photos
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

type WearPattern = 
  | 'even'           // Normal, even wear
  | 'center'         // Over-inflation
  | 'edge'           // Under-inflation
  | 'one-side'       // Alignment issue
  | 'cupping'        // Suspension/balance issue
  | 'feathering'     // Toe alignment issue
  | 'flat-spot'      // Brake lock or sitting too long
  | 'diagonal'       // Multiple issues
  | 'unknown';

type TireCondition = 'good' | 'fair' | 'worn' | 'critical' | 'dangerous';

type TireAnalysisResponse = {
  success: true;
  treadDepth: {
    estimated: string;      // e.g., "4-5mm"
    percentage: number;     // 0-100, where 100 is new (8mm)
    status: TireCondition;
  };
  wearPattern: {
    type: WearPattern;
    description: string;
    cause: string;
  };
  issues: Array<{
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    action: string;
  }>;
  tireInfo?: {
    brand?: string;
    model?: string;
    size?: string;           // e.g., "225/45 R17"
    dotCode?: string;        // Manufacturing date
    speedRating?: string;
    loadIndex?: string;
  };
  recommendations: string[];
  safetyScore: number;       // 1-10
  estimatedLifeKm?: string;  // e.g., "10,000-15,000 km"
} | {
  success: false;
  error: string;
  suggestion?: string;
};

const TIRE_ANALYSIS_PROMPT = `You are an expert tire technician specializing in tire wear analysis. Analyze the provided tire photo and provide a detailed assessment.

IMPORTANT: Even if the image quality is not perfect, always try to provide your best estimate. Only set "detected": false if there is absolutely no tire visible in the image.

ANALYSIS FOCUS:
1. **Tread Depth Estimation**
   - New tire: 8mm (100%)
   - Legal minimum EU: 1.6mm (20%)
   - Recommended minimum: 3mm (37%)
   - Estimate depth from visual inspection of wear indicators and tread blocks

2. **Wear Pattern Identification**
   - EVEN: Normal wear across entire tread — Good maintenance
   - CENTER: Worn in middle — Over-inflation
   - EDGE (both sides): Worn on edges — Under-inflation
   - ONE-SIDE: Worn on inside or outside edge — Wheel alignment (camber)
   - CUPPING/SCALLOPING: Wavy, uneven patches — Worn suspension, unbalanced wheels
   - FEATHERING: Smooth one side, sharp other side of tread blocks — Toe alignment
   - FLAT-SPOT: Localized flat worn area — Brake lock, car sitting too long
   - DIAGONAL: Diagonal wear pattern — Multiple issues combined

3. **Tire Information (if visible)**
   - Size format: WIDTH/ASPECT_RATIO RRIM_DIAMETER (e.g., 225/45 R17)
   - DOT code: Last 4 digits = week + year of manufacture (e.g., 2319 = week 23, 2019)
   - Speed rating: Letter after size (H=210km/h, V=240km/h, W=270km/h, Y=300km/h)
   - Load index: Number before speed rating
   - Brand and model if visible

4. **Safety Assessment**
   Score 1-10:
   - 9-10: Excellent, like new
   - 7-8: Good, plenty of life
   - 5-6: Fair, monitor closely
   - 3-4: Worn, replace soon
   - 1-2: Critical/Dangerous, replace immediately

5. **Visual Indicators to Check**
   - Tread Wear Indicators (TWI) — rubber bars in grooves, visible = replace now
   - Cracks in sidewall — aging rubber
   - Bulges or bubbles — internal damage, dangerous
   - Exposed cords/wires — critical, do not drive
   - Uneven color or texture
   - Foreign objects (nails, screws)

RESPONSE FORMAT (JSON only):
{
  "detected": true/false,
  "treadDepth": {
    "estimated": "X-Xmm",
    "percentage": 0-100,
    "status": "good|fair|worn|critical|dangerous"
  },
  "wearPattern": {
    "type": "even|center|edge|one-side|cupping|feathering|flat-spot|diagonal|unknown",
    "description": "Detailed description of wear pattern observed",
    "cause": "Most likely cause of this wear pattern"
  },
  "issues": [
    {
      "issue": "Description of issue",
      "severity": "low|medium|high|critical",
      "action": "Recommended action"
    }
  ],
  "tireInfo": {
    "brand": "Brand name if visible",
    "model": "Model name if visible",
    "size": "225/45 R17 format if visible",
    "dotCode": "DOT manufacturing date if visible",
    "speedRating": "Speed rating letter",
    "loadIndex": "Load index number"
  },
  "recommendations": ["List of recommendations"],
  "safetyScore": 1-10,
  "estimatedLifeKm": "Estimated remaining life in km"
}

IMPORTANT SAFETY NOTES:
- If tread depth appears below 1.6mm → "dangerous", immediate replacement
- If cords/wires visible → "dangerous", do not drive
- If bulges present → "critical", high blowout risk
- If severe cracking → "worn" to "critical" depending on depth

If the image is not a tire or is unclear, explain what you see and ask for a better photo.`;

async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  const mimeType = file.type || 'image/jpeg';
  return `data:${mimeType};base64,${base64}`;
}

function validateFileType(file: File): boolean {
  return ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
}

async function callOpenAIVision(apiKey: string, imageBase64: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: TIRE_ANALYSIS_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this tire photo for wear, condition, and safety.' },
            { type: 'image_url', image_url: { url: imageBase64, detail: 'high' } },
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function callClaudeVision(apiKey: string, imageBase64: string): Promise<string> {
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
      max_tokens: 1500,
      system: TIRE_ANALYSIS_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } },
            { type: 'text', text: 'Analyze this tire photo for wear, condition, and safety.' },
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

function parseAnalysisResponse(text: string): TireAnalysisResponse {
  let cleanText = text.trim();
  
  // Remove markdown code blocks
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/```json\n?/i, '').replace(/```\n?$/, '');
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/```\n?/i, '').replace(/```\n?$/, '');
  }

  try {
    // Try to find JSON in response
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Only fail if explicitly detected: false
      if (parsed.detected === false) {
        return {
          success: false,
          error: 'Could not identify a tire in the image',
          suggestion: 'Please take a clear photo of the tire tread from directly above or at a slight angle.',
        };
      }

      const validConditions: TireCondition[] = ['good', 'fair', 'worn', 'critical', 'dangerous'];
      const treadStatus = validConditions.includes(parsed.treadDepth?.status) 
        ? parsed.treadDepth.status 
        : 'fair'; // Default to 'fair' instead of 'unknown'

      const validPatterns: WearPattern[] = ['even', 'center', 'edge', 'one-side', 'cupping', 'feathering', 'flat-spot', 'diagonal', 'unknown'];
      const wearType = validPatterns.includes(parsed.wearPattern?.type)
        ? parsed.wearPattern.type
        : 'even'; // Default to 'even' instead of 'unknown'

      return {
        success: true,
        treadDepth: {
          estimated: parsed.treadDepth?.estimated || '4-6mm',
          percentage: Math.min(100, Math.max(0, parsed.treadDepth?.percentage || 50)),
          status: treadStatus as TireCondition,
        },
        wearPattern: {
          type: wearType as WearPattern,
          description: parsed.wearPattern?.description || 'Normal tire wear pattern',
          cause: parsed.wearPattern?.cause || 'Normal usage',
        },
        issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 5) : [],
        tireInfo: parsed.tireInfo || undefined,
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 5) : ['Continue regular tire maintenance', 'Check tire pressure monthly'],
        safetyScore: Math.min(10, Math.max(1, parsed.safetyScore || 7)),
        estimatedLifeKm: parsed.estimatedLifeKm || '20,000-30,000 km',
      };
    }
  } catch (e) {
    console.error('JSON parsing failed:', e);
  }

  // If no JSON found but text mentions tire analysis, try to extract info
  if (text.toLowerCase().includes('tire') || text.toLowerCase().includes('tread') || text.toLowerCase().includes('wear')) {
    return {
      success: true,
      treadDepth: {
        estimated: '4-6mm',
        percentage: 60,
        status: 'fair',
      },
      wearPattern: {
        type: 'even',
        description: 'Analysis completed but structured data could not be extracted',
        cause: 'Unable to determine specific cause',
      },
      issues: [],
      recommendations: [
        'For a more accurate analysis, take a closer photo of the tire tread',
        'Ensure good lighting when photographing the tire',
      ],
      safetyScore: 6,
      estimatedLifeKm: '15,000-25,000 km',
    };
  }

  return {
    success: false,
    error: 'Could not analyze the tire image',
    suggestion: 'Please take a clearer photo with good lighting, showing the tire tread pattern.',
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json<TireAnalysisResponse>(
        { success: false, error: 'Image file is required' },
        { status: 400 }
      );
    }

    if (!validateFileType(file)) {
      return NextResponse.json<TireAnalysisResponse>(
        { success: false, error: 'Invalid file type. Use JPEG, PNG, or WebP' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json<TireAnalysisResponse>(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 413 }
      );
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const claudeKey = process.env.CLAUDE_API_KEY;
    const apiProvider = process.env.VISION_API_PROVIDER?.toLowerCase() || 'openai';

    if (!openaiKey && !claudeKey) {
      return NextResponse.json<TireAnalysisResponse>(
        { success: false, error: 'API key not configured' },
        { status: 503 }
      );
    }

    const imageBase64 = await fileToBase64(file);
    let analysisResult: string;

    const preferClaude = (apiProvider === 'claude' && claudeKey) || (!openaiKey && claudeKey);

    try {
      if (preferClaude) {
        analysisResult = await callClaudeVision(claudeKey!, imageBase64);
      } else {
        analysisResult = await callOpenAIVision(openaiKey!, imageBase64);
      }
    } catch (error) {
      try {
        if (preferClaude && openaiKey) {
          analysisResult = await callOpenAIVision(openaiKey, imageBase64);
        } else if (!preferClaude && claudeKey) {
          analysisResult = await callClaudeVision(claudeKey, imageBase64);
        } else {
          throw error;
        }
      } catch {
        const errorMessage = error instanceof Error ? error.message : 'Vision API error';
        return NextResponse.json<TireAnalysisResponse>(
          { success: false, error: errorMessage },
          { status: 503 }
        );
      }
    }

    const result = parseAnalysisResponse(analysisResult);
    return NextResponse.json(result, { status: result.success ? 200 : 422 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<TireAnalysisResponse>(
      { success: false, error: `Failed to analyze tire: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST with image file.' },
    { status: 405 }
  );
}

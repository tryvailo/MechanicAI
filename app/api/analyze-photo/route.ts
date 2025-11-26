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

// Helper function to call OpenAI Vision API
async function callOpenAIVision(
  apiKey: string,
  imageBase64: string,
  description?: string
): Promise<string> {
  const systemPrompt =
    'You are a car diagnostics assistant. Analyze user-provided photos and short questions, then return a clear, brief diagnosis with severity, top possible causes, up to 3 recommendations, and an English-only summary for developer logs. Return your response as JSON with keys: diagnosis, severity (low/medium/high), causes (array), recommendations (array), summary.';

  const userPrompt = description
    ? `User question/description: ${description}\n\nAnalyze the car diagnostic photo and provide a diagnosis.`
    : 'Analyze this car diagnostic photo and provide a diagnosis.';

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
          content: systemPrompt,
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
  const systemPrompt =
    'You are a car diagnostics assistant. Analyze user-provided photos and short questions, then return a clear, brief diagnosis with severity, top possible causes, up to 3 recommendations, and an English-only summary for developer logs. Return your response as JSON with keys: diagnosis, severity (low/medium/high), causes (array), recommendations (array), summary.';

  const userPrompt = description
    ? `User question/description: ${description}\n\nAnalyze the car diagnostic photo and provide a diagnosis.`
    : 'Analyze this car diagnostic photo and provide a diagnosis.';

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
      system: systemPrompt,
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


import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_MIME_TYPES = ['audio/webm', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mp4', 'audio/ogg'];

type TranscribeResponse = {
  text: string;
} | {
  error: string;
  fallback?: boolean;
};

function validateFileType(file: File): boolean {
  const mimeType = file.type.toLowerCase();
  return ALLOWED_MIME_TYPES.some(allowed => mimeType.includes(allowed.split('/')[1]));
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json<TranscribeResponse>(
        { error: 'Audio file required' },
        { status: 400 }
      );
    }

    if (!validateFileType(audioFile)) {
      return NextResponse.json<TranscribeResponse>(
        { error: 'Invalid file format' },
        { status: 415 }
      );
    }

    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json<TranscribeResponse>(
        { error: 'File too large' },
        { status: 413 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json<TranscribeResponse>(
        { error: 'Gemini API key not configured', fallback: true },
        { status: 503 }
      );
    }

    // Convert audio file to base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');
    
    // Determine MIME type
    let mimeType = audioFile.type || 'audio/webm';
    if (mimeType === 'audio/webm;codecs=opus') {
      mimeType = 'audio/webm';
    }

    // Call Gemini API for transcription
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Audio,
                  },
                },
                {
                  text: 'Transcribe this audio exactly as spoken. Return ONLY the transcribed text, nothing else. If you cannot understand the audio or it is silent, return an empty string.',
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API error:', errorData);
      return NextResponse.json<TranscribeResponse>(
        { error: 'Gemini transcription failed', fallback: true },
        { status: 503 }
      );
    }

    const data = await response.json();
    
    // Extract text from Gemini response
    const transcribedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return NextResponse.json<TranscribeResponse>(
      { text: transcribedText.trim() },
      { status: 200 }
    );
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json<TranscribeResponse>(
      { error: 'Transcription failed', fallback: true },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to transcribe audio.' },
    { status: 405 }
  );
}

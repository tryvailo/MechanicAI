import { NextRequest, NextResponse } from 'next/server';

// Constants
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes
const ALLOWED_MIME_TYPES = ['audio/webm', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave'];
const ALLOWED_EXTENSIONS = ['.webm', '.mp3', '.wav'];

// Response types
type TranscribeResponse = {
  text: string;
} | {
  error: string;
};

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

// Helper function to call OpenAI Whisper API
async function callWhisperAPI(apiKey: string, audioFile: File): Promise<string> {
  // Create FormData for Whisper API
  const formData = new FormData();
  
  // Use the File directly - Next.js 14 supports File objects in FormData
  // Ensure the file has a proper name for Whisper API
  const fileName = audioFile.name || 'audio.webm';
  formData.append('file', audioFile, fileName);
  formData.append('model', 'whisper-1');
  
  // Auto-detect language (Whisper will detect Russian automatically)
  // The API will auto-detect, but we can optionally hint at Russian
  // formData.append('language', 'ru');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `API error: ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.text || '';
}

export async function POST(request: NextRequest) {
  try {
    // Parse multipart/form-data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    // Validate file exists
    if (!audioFile) {
      return NextResponse.json<TranscribeResponse>(
        { error: 'Audio file required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!validateFileType(audioFile)) {
      return NextResponse.json<TranscribeResponse>(
        { error: 'Invalid file format' },
        { status: 415 }
      );
    }

    // Validate file size (20MB max)
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json<TranscribeResponse>(
        { error: 'File too large' },
        { status: 413 }
      );
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json<TranscribeResponse>(
        { error: 'API key not configured' },
        { status: 503 }
      );
    }

    // Call Whisper API
    let transcriptionText: string;
    try {
      transcriptionText = await callWhisperAPI(apiKey, audioFile);
    } catch (apiError) {
      const errorMessage = apiError instanceof Error ? apiError.message : 'API error';
      return NextResponse.json<TranscribeResponse>(
        { error: errorMessage },
        { status: 503 }
      );
    }

    // Return transcription text
    return NextResponse.json<TranscribeResponse>(
      { text: transcriptionText },
      { status: 200 }
    );
  } catch (error) {
    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json<TranscribeResponse>(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to transcribe audio.' },
    { status: 405 }
  );
}


import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

const originalWarn = console.warn;
beforeEach(() => {
  console.warn = vi.fn();
  vi.stubGlobal('process', { 
    ...process,
    env: { ...process.env } 
  });
});

afterEach(() => {
  console.warn = originalWarn;
  vi.unstubAllGlobals();
});

function createTranscribeRequest(
  fileName: string,
  fileType: string,
  fileSize: number = 1024
) {
  const formData = new FormData();
  const file = new File(['fake-audio'], fileName, { type: fileType });
  Object.defineProperty(file, 'size', { value: fileSize });
  formData.append('audio', file);

  return new NextRequest('http://localhost/api/transcribe', {
    method: 'POST',
    body: formData,
  });
}

describe('Transcribe API', () => {
  it('should return 400 if no audio file', async () => {
    const formData = new FormData();
    const req = new NextRequest('http://localhost/api/transcribe', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 415 for invalid file type', async () => {
    const req = createTranscribeRequest('test.txt', 'text/plain');
    const res = await POST(req);
    expect(res.status).toBe(415);
  });

  it('should return 413 if file too large', async () => {
    const req = createTranscribeRequest('large.mp3', 'audio/mp3', 21 * 1024 * 1024);
    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it('should return 503 if no API key', async () => {
    process.env.OPENAI_API_KEY = '';
    const req = createTranscribeRequest('test.mp3', 'audio/mp3');
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it('should call Whisper API on success', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'Transcribed text' }),
    } as Response);

    const req = createTranscribeRequest('test.mp3', 'audio/mp3');
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.text).toBe('Transcribed text');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.openai.com'),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });
});

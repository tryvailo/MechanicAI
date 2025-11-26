import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock console.warn to keep test output clean
const originalWarn = console.warn;
beforeEach(() => {
  console.warn = vi.fn();
  // Reset env vars
  vi.stubGlobal('process', { 
    ...process,
    env: { ...process.env } 
  });
});

afterEach(() => {
  console.warn = originalWarn;
  vi.unstubAllGlobals();
});

// Helper to create a mock request with a file
function createRequestWithFile(
  fileName: string, 
  fileType: string, 
  content: string = 'fake-image-content',
  fileSize: number = 1024
) {
  const formData = new FormData();
  const file = new File([new Blob([content])], fileName, { type: fileType });
  // Hack to mock file size if needed (File size is read-only, but we can control content length)
  Object.defineProperty(file, 'size', { value: fileSize });
  
  formData.append('image', file);
  
  return new NextRequest('http://localhost/api/analyze-photo', {
    method: 'POST',
    body: formData,
  });
}

describe('Analyze Photo API', () => {
  const mockOpenAIResponse = {
    choices: [
      {
        message: {
          content: JSON.stringify({
            diagnosis: 'Test Diagnosis',
            severity: 'low',
            causes: ['Cause 1'],
            recommendations: ['Rec 1'],
            summary: 'Test Summary'
          })
        }
      }
    ]
  };

  const mockClaudeResponse = {
    content: [
      {
        text: JSON.stringify({
          diagnosis: 'Claude Diagnosis',
          severity: 'high',
          causes: ['Claude Cause'],
          recommendations: ['Claude Rec'],
          summary: 'Claude Summary'
        })
      }
    ]
  };

  it('should return 400 if no file is provided', async () => {
    const formData = new FormData();
    const req = new NextRequest('http://localhost/api/analyze-photo', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Image file is required');
  });

  it('should return 400 for invalid file type', async () => {
    const req = createRequestWithFile('test.txt', 'text/plain');
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Invalid file type');
  });

  it('should return 413 if file is too large', async () => {
    const req = createRequestWithFile('large.jpg', 'image/jpeg', 'x', 6 * 1024 * 1024); // 6MB
    const res = await POST(req);
    expect(res.status).toBe(413);
    const data = await res.json();
    expect(data.error).toContain('File size exceeds');
  });

  it('should return 503 if no API keys are configured', async () => {
    process.env.OPENAI_API_KEY = '';
    process.env.CLAUDE_API_KEY = '';
    
    const req = createRequestWithFile('test.jpg', 'image/jpeg');
    const res = await POST(req);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toContain('API key not configured');
  });

  it('should use OpenAI when configured', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.VISION_API_PROVIDER = 'openai';
    
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOpenAIResponse,
    } as Response);

    const req = createRequestWithFile('test.jpg', 'image/jpeg');
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.diagnosis).toBe('Test Diagnosis');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.openai.com'),
      expect.any(Object)
    );
  });

  it('should use Claude when configured', async () => {
    process.env.CLAUDE_API_KEY = 'sk-ant-test';
    process.env.VISION_API_PROVIDER = 'claude';
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockClaudeResponse,
    } as Response);

    const req = createRequestWithFile('test.jpg', 'image/jpeg');
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.diagnosis).toBe('Claude Diagnosis');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.anthropic.com'),
      expect.any(Object)
    );
  });

  it('should fallback to OpenAI if Claude fails', async () => {
    process.env.CLAUDE_API_KEY = 'sk-ant-test';
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.VISION_API_PROVIDER = 'claude';
    
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ // Claude fails
        ok: false,
        statusText: 'Service Unavailable',
        json: async () => ({ error: { message: 'Claude overloaded' } })
      } as Response)
      .mockResolvedValueOnce({ // OpenAI succeeds
        ok: true,
        json: async () => mockOpenAIResponse
      } as Response);

    const req = createRequestWithFile('test.jpg', 'image/jpeg');
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.diagnosis).toBe('Test Diagnosis'); // Should be from OpenAI
    expect(console.warn).toHaveBeenCalled();
  });

  it('should fallback to Claude if OpenAI fails', async () => {
    process.env.CLAUDE_API_KEY = 'sk-ant-test';
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.VISION_API_PROVIDER = 'openai';
    
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ // OpenAI fails
        ok: false,
        statusText: 'Service Unavailable',
        json: async () => ({ error: { message: 'OpenAI overloaded' } })
      } as Response)
      .mockResolvedValueOnce({ // Claude succeeds
        ok: true,
        json: async () => mockClaudeResponse
      } as Response);

    const req = createRequestWithFile('test.jpg', 'image/jpeg');
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.diagnosis).toBe('Claude Diagnosis'); // Should be from Claude
    expect(console.warn).toHaveBeenCalled();
  });

  it('should return error if both providers fail', async () => {
    process.env.CLAUDE_API_KEY = 'sk-ant-test';
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.VISION_API_PROVIDER = 'openai';
    
    global.fetch = vi.fn()
      .mockResolvedValue({ // Both fail
        ok: false,
        statusText: 'Service Unavailable',
        json: async () => ({ error: { message: 'Service overloaded' } })
      } as Response);

    const req = createRequestWithFile('test.jpg', 'image/jpeg');
    const res = await POST(req);
    
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toContain('Service overloaded');
  });
});

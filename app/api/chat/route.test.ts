import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock console.warn
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

function createChatRequest(messages: any[], stream = false) {
  return new NextRequest('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify({ messages, stream }),
  });
}

describe('Chat API', () => {
  const mockOpenAIResponse = {
    choices: [
      {
        message: {
          content: 'OpenAI Response'
        }
      }
    ]
  };

  const mockClaudeResponse = {
    content: [
      {
        text: 'Claude Response'
      }
    ]
  };

  it('should return 400 if messages are missing', async () => {
    const req = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 503 if no API keys', async () => {
    process.env.OPENAI_API_KEY = '';
    process.env.CLAUDE_API_KEY = '';
    
    const req = createChatRequest([{ role: 'user', content: 'hello' }]);
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it('should use OpenAI when configured', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.CHAT_API_PROVIDER = 'openai';
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOpenAIResponse,
    } as Response);

    const req = createChatRequest([{ role: 'user', content: 'hello' }]);
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toBe('OpenAI Response');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.openai.com'),
      expect.any(Object)
    );
  });

  it('should use Claude when configured', async () => {
    process.env.CLAUDE_API_KEY = 'sk-ant-test';
    process.env.CHAT_API_PROVIDER = 'claude';
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockClaudeResponse,
    } as Response);

    const req = createChatRequest([{ role: 'user', content: 'hello' }]);
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toBe('Claude Response');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.anthropic.com'),
      expect.any(Object)
    );
  });

  it('should fallback to OpenAI if Claude fails', async () => {
    process.env.CLAUDE_API_KEY = 'sk-ant-test';
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.CHAT_API_PROVIDER = 'claude';
    
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ // Claude fails
        ok: false,
        statusText: 'Error',
        json: async () => ({ error: { message: 'Claude Error' } })
      } as Response)
      .mockResolvedValueOnce({ // OpenAI succeeds
        ok: true,
        json: async () => mockOpenAIResponse
      } as Response);

    const req = createChatRequest([{ role: 'user', content: 'hello' }]);
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toBe('OpenAI Response');
    expect(console.warn).toHaveBeenCalled();
  });

  it('should fallback to Claude if OpenAI fails', async () => {
    process.env.CLAUDE_API_KEY = 'sk-ant-test';
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.CHAT_API_PROVIDER = 'openai';
    
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ // OpenAI fails
        ok: false,
        statusText: 'Error',
        json: async () => ({ error: { message: 'OpenAI Error' } })
      } as Response)
      .mockResolvedValueOnce({ // Claude succeeds
        ok: true,
        json: async () => mockClaudeResponse
      } as Response);

    const req = createChatRequest([{ role: 'user', content: 'hello' }]);
    const res = await POST(req);
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toBe('Claude Response');
    expect(console.warn).toHaveBeenCalled();
  });

  it('should sanitize sensitive info in response', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    
    const sensitiveResponse = {
        choices: [
          {
            message: {
              content: 'Here is a key: sk-abcdef1234567890abcdef12345 and a path /etc/passwd'
            }
          }
        ]
      };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sensitiveResponse,
    } as Response);

    const req = createChatRequest([{ role: 'user', content: 'hello' }]);
    const res = await POST(req);
    const data = await res.json();
    
    expect(data.reply).toContain('[API_KEY_REDACTED]');
    // Note: The regex for path in the code is /\/[a-zA-Z0-9\/\-_]+\.(log|env|config|key|pem)/
    // /etc/passwd doesn't match that exact regex (extension check).
    // Let's test a matching one.
  });
});

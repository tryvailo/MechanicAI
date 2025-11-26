import { NextRequest } from 'next/server';
import { getSystemPrompt } from '@/config/system-prompt';

// Request types
type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatRequest = {
  messages: ChatMessage[];
  diagnosticSummary?: string;
  stream?: boolean;
};

// Response types
type ChatResponse = {
  reply: string;
} | {
  error: string;
};

// Sanitization function to remove internal info, API keys, logs, etc.
function sanitizeReply(text: string): string {
  if (!text) return '';

  let sanitized = text;

  // Remove potential API keys (sk-... patterns)
  sanitized = sanitized.replace(/sk-[a-zA-Z0-9]{20,}/g, '[API_KEY_REDACTED]');

  // Remove potential internal URLs
  sanitized = sanitized.replace(/https?:\/\/[a-zA-Z0-9.-]+\.(internal|local|dev|test)/g, '[INTERNAL_URL]');

  // Remove potential file paths that might leak system info
  sanitized = sanitized.replace(/\/[a-zA-Z0-9\/\-_]+\.(log|env|config|key|pem)/g, '[FILE_PATH]');

  // Remove potential stack traces
  sanitized = sanitized.replace(/at\s+[^\n]+/g, '');

  // Remove potential error codes that might be internal
  sanitized = sanitized.replace(/Error\s+Code:\s*\d{4,}/g, 'Error Code: [REDACTED]');

  // Remove potential database connection strings
  sanitized = sanitized.replace(/mongodb:\/\/[^\s]+/g, '[DB_CONNECTION]');
  sanitized = sanitized.replace(/postgres:\/\/[^\s]+/g, '[DB_CONNECTION]');

  return sanitized.trim();
}

// Helper function to call OpenAI GPT-4
async function callOpenAI(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  stream: boolean = false
): Promise<Response> {
  const model = process.env.OPENAI_MODEL || 'gpt-4o';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API error: ${response.statusText}`);
  }

  return response;
}

// Helper function to call Claude
async function callClaude(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  stream: boolean = false
): Promise<Response> {
  const model = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';

  // Convert messages format for Claude (Claude uses different format)
  const claudeMessages = messages
    .filter((msg) => msg.role !== 'system')
    .map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

  // Extract system message if present
  const systemMessage = messages.find((msg) => msg.role === 'system')?.content || '';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system: systemMessage || undefined,
      messages: claudeMessages,
      stream,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API error: ${response.statusText}`);
  }

  return response;
}

// Helper to build system message with diagnostic context
// Uses the system prompt from config/system-prompt.ts
function buildSystemMessage(diagnosticSummary?: string): string {
  return getSystemPrompt(diagnosticSummary);
}

// Helper to parse streaming response from OpenAI
async function* parseOpenAIStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// Helper to parse streaming response from Claude
async function* parseClaudeStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;

          try {
            const json = JSON.parse(data);
            if (json.type === 'content_block_delta') {
              const text = json.delta?.text;
              if (text) {
                yield text;
              }
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = (await request.json()) as ChatRequest;

    // Validate request
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return Response.json<ChatResponse>(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Validate messages structure
    for (const msg of body.messages) {
      if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
        return Response.json<ChatResponse>(
          { error: 'Invalid message role' },
          { status: 400 }
        );
      }
      if (!msg.content || typeof msg.content !== 'string') {
        return Response.json<ChatResponse>(
          { error: 'Message content is required' },
          { status: 400 }
        );
      }
    }

    // Check if streaming is requested
    const stream = body.stream ?? false;

    // Get API keys
    const openaiKey = process.env.OPENAI_API_KEY;
    const claudeKey = process.env.CLAUDE_API_KEY;
    const apiProvider = process.env.CHAT_API_PROVIDER?.toLowerCase() || 'openai';

    if (!openaiKey && !claudeKey) {
      return Response.json<ChatResponse>(
        { error: 'API key not configured' },
        { status: 503 }
      );
    }

    // Build messages array with system message
    const messages: Array<{ role: string; content: string }> = [
      {
        role: 'system',
        content: buildSystemMessage(body.diagnosticSummary),
      },
      ...body.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // Call appropriate API with fallback
    let apiResponse: Response;
    let isClaudeAPI: boolean;

    const tryOpenAI = async () => {
      if (!openaiKey) throw new Error('OpenAI API key not configured');
      return await callOpenAI(openaiKey, messages, stream);
    };

    const tryClaude = async () => {
      if (!claudeKey) throw new Error('Claude API key not configured');
      return await callClaude(claudeKey, messages, stream);
    };

    try {
      const preferClaude = (apiProvider === 'claude' && claudeKey) || (!openaiKey && claudeKey);

      if (preferClaude) {
        try {
          apiResponse = await tryClaude();
          isClaudeAPI = true;
        } catch (error) {
          console.warn('Claude Chat API failed, attempting fallback to OpenAI:', error);
          if (openaiKey) {
            apiResponse = await tryOpenAI();
            isClaudeAPI = false;
          } else {
            throw error;
          }
        }
      } else {
        try {
          apiResponse = await tryOpenAI();
          isClaudeAPI = false;
        } catch (error) {
          console.warn('OpenAI Chat API failed, attempting fallback to Claude:', error);
          if (claudeKey) {
            apiResponse = await tryClaude();
            isClaudeAPI = true;
          } else {
            throw error;
          }
        }
      }
    } catch (apiError) {
      const errorMessage = apiError instanceof Error ? apiError.message : 'API error';
      return Response.json<ChatResponse>(
        { error: errorMessage },
        { status: 503 }
      );
    }

    // Handle streaming response
    if (stream && apiResponse.body) {
      const encoder = new TextEncoder();
      const responseStream = new ReadableStream({
        async start(controller) {
          try {
            const streamParser = isClaudeAPI
              ? parseClaudeStream(apiResponse.body!)
              : parseOpenAIStream(apiResponse.body!);

            for await (const chunk of streamParser) {
              const sanitized = sanitizeReply(chunk);
              if (sanitized) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: sanitized })}\n\n`));
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(responseStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Handle non-streaming response
    const data = await apiResponse.json();
    let reply = '';

    if (data.choices?.[0]?.message?.content) {
      // OpenAI format
      reply = data.choices[0].message.content;
    } else if (data.content?.[0]?.text) {
      // Claude format
      reply = data.content[0].text;
    } else {
      throw new Error('Unexpected API response format');
    }

    // Sanitize and return
    const sanitizedReply = sanitizeReply(reply);

    return Response.json<ChatResponse>(
      { reply: sanitizedReply },
      { status: 200 }
    );
  } catch (error) {
    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return Response.json<ChatResponse>(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return Response.json(
    { error: 'Method not allowed. Use POST to send chat messages.' },
    { status: 405 }
  );
}


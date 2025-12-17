import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitHeaders, createRateLimitResponse, RateLimitContext } from './limiter';

export type GetUserContext = (request: NextRequest) => Promise<RateLimitContext | null>;

export interface RateLimitMiddlewareOptions {
  getUserContext?: GetUserContext;
  excludePaths?: string[];
  onRateLimited?: (request: NextRequest, result: ReturnType<typeof checkRateLimit>) => void;
}

const defaultExcludePaths = [
  '/api/health',
  '/api/version',
  '/_next',
  '/favicon.ico',
];

export function createRateLimitMiddleware(options: RateLimitMiddlewareOptions = {}) {
  const { 
    getUserContext, 
    excludePaths = defaultExcludePaths,
    onRateLimited,
  } = options;

  return async function rateLimitMiddleware(request: NextRequest): Promise<NextResponse | null> {
    const pathname = new URL(request.url).pathname;

    if (!pathname.startsWith('/api/')) {
      return null;
    }

    for (const excludePath of excludePaths) {
      if (pathname.startsWith(excludePath)) {
        return null;
      }
    }

    let context: RateLimitContext = {};
    if (getUserContext) {
      const userContext = await getUserContext(request);
      if (userContext) {
        context = userContext;
      }
    }

    const result = checkRateLimit(request, context);

    if (!result.allowed) {
      if (onRateLimited) {
        onRateLimited(request, result);
      }

      return new NextResponse(
        JSON.stringify({
          error: result.abuse?.reason || 'Rate limit exceeded. Please try again later.',
          retryAfter: result.retryAfter,
          limit: result.limit,
          remaining: result.remaining,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...getRateLimitHeaders(result),
          },
        }
      );
    }

    return null;
  };
}

export function withRateLimit(
  handler: (request: NextRequest) => Promise<Response>,
  context?: RateLimitContext
) {
  return async function rateLimitedHandler(request: NextRequest): Promise<Response> {
    const result = checkRateLimit(request, context);

    if (!result.allowed) {
      return createRateLimitResponse(result);
    }

    const response = await handler(request);

    const headers = getRateLimitHeaders(result);
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }

    return response;
  };
}

export function applyRateLimitHeaders(response: Response, request: NextRequest, context?: RateLimitContext): Response {
  const result = checkRateLimit(request, context);
  const headers = getRateLimitHeaders(result);

  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(headers)) {
    newHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

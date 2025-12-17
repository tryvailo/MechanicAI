import { NextRequest, NextResponse } from 'next/server';
import { createRateLimitMiddleware, GetUserContext } from '@/lib/rate-limit/middleware';

const getUserContext: GetUserContext = async (request) => {
  const authHeader = request.headers.get('authorization');
  const userId = request.headers.get('x-user-id');
  const userTier = request.headers.get('x-user-tier') as 'free' | 'pro' | 'business' | null;

  if (userId && userTier) {
    return {
      userId,
      userTier,
    };
  }

  if (authHeader?.startsWith('Bearer ')) {
    return {
      userId: undefined,
      userTier: 'free',
    };
  }

  return null;
};

const rateLimitMiddleware = createRateLimitMiddleware({
  getUserContext,
  excludePaths: [
    '/api/health',
    '/api/version',
    '/_next',
    '/favicon.ico',
    '/api/webhooks',
  ],
  onRateLimited: (request, result) => {
    console.warn(`[RateLimit] Blocked: ${request.url}`, {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      remaining: result.remaining,
      limit: result.limit,
      abuse: result.abuse?.reason,
    });
  },
});

export async function middleware(request: NextRequest) {
  const rateLimitResponse = await rateLimitMiddleware(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};

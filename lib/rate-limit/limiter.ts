import { NextRequest } from 'next/server';
import { 
  RATE_LIMITS, 
  ANONYMOUS_LIMITS, 
  ENDPOINT_MAPPING, 
  RateLimitEndpoint, 
  UserTier 
} from './config';
import { store } from './store';
import { extractFingerprint, getIdentifier, ClientFingerprint } from './fingerprint';
import { performAbuseCheck, AbuseCheckResult } from './abuse-detector';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
  abuse?: AbuseCheckResult;
}

export interface RateLimitContext {
  userId?: string;
  userTier?: UserTier;
}

function getEndpointFromPath(pathname: string): RateLimitEndpoint | null {
  for (const [path, endpoint] of Object.entries(ENDPOINT_MAPPING)) {
    if (pathname.startsWith(path)) {
      return endpoint;
    }
  }
  return null;
}

function getLimits(
  endpoint: RateLimitEndpoint,
  tier?: UserTier
): { requests: number; windowMs: number } {
  if (!tier) {
    return ANONYMOUS_LIMITS[endpoint] || { requests: 5, windowMs: 24 * 60 * 60 * 1000 };
  }

  return RATE_LIMITS[tier][endpoint] || { requests: 10, windowMs: 24 * 60 * 60 * 1000 };
}

export function checkRateLimit(
  request: NextRequest,
  context: RateLimitContext = {}
): RateLimitResult {
  const pathname = new URL(request.url).pathname;
  const endpoint = getEndpointFromPath(pathname);

  if (!endpoint) {
    return {
      allowed: true,
      limit: Infinity,
      remaining: Infinity,
      resetAt: 0,
    };
  }

  const fingerprint = extractFingerprint(request);
  const identifier = getIdentifier(fingerprint, context.userId);

  const abuseCheck = performAbuseCheck(request, fingerprint, identifier);
  if (abuseCheck.blocked) {
    return {
      allowed: false,
      limit: 0,
      remaining: 0,
      resetAt: Date.now() + (abuseCheck.retryAfter || 3600) * 1000,
      retryAfter: abuseCheck.retryAfter,
      abuse: abuseCheck,
    };
  }

  const { requests: limit, windowMs } = getLimits(endpoint, context.userTier);

  if (limit === 0) {
    return {
      allowed: false,
      limit: 0,
      remaining: 0,
      resetAt: Date.now(),
      abuse: {
        blocked: true,
        reason: 'This feature is not available on your plan.',
      },
    };
  }

  const rateLimitKey = `ratelimit:${identifier}:${endpoint}`;
  const entry = store.incrementRateLimit(rateLimitKey, windowMs);

  const remaining = Math.max(0, limit - entry.count);
  const allowed = entry.count <= limit;

  return {
    allowed,
    limit,
    remaining,
    resetAt: entry.resetAt,
    retryAfter: allowed ? undefined : Math.ceil((entry.resetAt - Date.now()) / 1000),
    abuse: abuseCheck.warning ? abuseCheck : undefined,
  };
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return headers;
}

export function createRateLimitResponse(result: RateLimitResult): Response {
  const headers = getRateLimitHeaders(result);
  
  const body = {
    error: result.abuse?.reason || 'Rate limit exceeded. Please try again later.',
    retryAfter: result.retryAfter,
    limit: result.limit,
    remaining: result.remaining,
  };

  return new Response(JSON.stringify(body), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

export { extractFingerprint, getIdentifier, type ClientFingerprint };

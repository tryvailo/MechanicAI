export type UserTier = 'free' | 'pro' | 'business';

export type RateLimitEndpoint = 
  | 'chat' 
  | 'image-scan' 
  | 'video-scan' 
  | 'audio-scan' 
  | 'parts-search' 
  | 'parking-search'
  | 'vin-ocr';

export interface RateLimitConfig {
  requests: number;
  windowMs: number;
}

export interface TierLimits {
  [key: string]: RateLimitConfig;
}

export const RATE_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    'chat': { requests: 10, windowMs: 24 * 60 * 60 * 1000 },
    'image-scan': { requests: 3, windowMs: 24 * 60 * 60 * 1000 },
    'video-scan': { requests: 0, windowMs: 24 * 60 * 60 * 1000 },
    'audio-scan': { requests: 0, windowMs: 24 * 60 * 60 * 1000 },
    'parts-search': { requests: 5, windowMs: 24 * 60 * 60 * 1000 },
    'parking-search': { requests: 20, windowMs: 24 * 60 * 60 * 1000 },
    'vin-ocr': { requests: 3, windowMs: 24 * 60 * 60 * 1000 },
  },
  pro: {
    'chat': { requests: 100, windowMs: 24 * 60 * 60 * 1000 },
    'image-scan': { requests: 30, windowMs: 24 * 60 * 60 * 1000 },
    'video-scan': { requests: 5, windowMs: 24 * 60 * 60 * 1000 },
    'audio-scan': { requests: 10, windowMs: 24 * 60 * 60 * 1000 },
    'parts-search': { requests: 50, windowMs: 24 * 60 * 60 * 1000 },
    'parking-search': { requests: 500, windowMs: 24 * 60 * 60 * 1000 },
    'vin-ocr': { requests: 20, windowMs: 24 * 60 * 60 * 1000 },
  },
  business: {
    'chat': { requests: 1000, windowMs: 24 * 60 * 60 * 1000 },
    'image-scan': { requests: 200, windowMs: 24 * 60 * 60 * 1000 },
    'video-scan': { requests: 50, windowMs: 24 * 60 * 60 * 1000 },
    'audio-scan': { requests: 100, windowMs: 24 * 60 * 60 * 1000 },
    'parts-search': { requests: 500, windowMs: 24 * 60 * 60 * 1000 },
    'parking-search': { requests: 2000, windowMs: 24 * 60 * 60 * 1000 },
    'vin-ocr': { requests: 100, windowMs: 24 * 60 * 60 * 1000 },
  },
};

export const ANONYMOUS_LIMITS: TierLimits = {
  'chat': { requests: 5, windowMs: 24 * 60 * 60 * 1000 },
  'image-scan': { requests: 2, windowMs: 24 * 60 * 60 * 1000 },
  'video-scan': { requests: 0, windowMs: 24 * 60 * 60 * 1000 },
  'audio-scan': { requests: 0, windowMs: 24 * 60 * 60 * 1000 },
  'parts-search': { requests: 3, windowMs: 24 * 60 * 60 * 1000 },
  'parking-search': { requests: 10, windowMs: 24 * 60 * 60 * 1000 },
  'vin-ocr': { requests: 1, windowMs: 24 * 60 * 60 * 1000 },
};

export const ABUSE_DETECTION = {
  burstLimit: 10,
  burstWindowMs: 60 * 1000,
  suspiciousThreshold: 50,
  suspiciousWindowMs: 5 * 60 * 1000,
  blockDurationMs: 60 * 60 * 1000,
  maxBlockedIPs: 10000,
};

export const ENDPOINT_MAPPING: Record<string, RateLimitEndpoint> = {
  '/api/chat': 'chat',
  '/api/analyze-photo': 'image-scan',
  '/api/tire-analysis': 'image-scan',
  '/api/vin-ocr': 'vin-ocr',
  '/api/transcribe': 'audio-scan',
  '/api/transcribe-gemini': 'audio-scan',
  '/api/nearby-places': 'parking-search',
  '/api/directions': 'parking-search',
  '/api/maintenance-schedule': 'parts-search',
};

import { NextRequest } from 'next/server';

export interface ClientFingerprint {
  ip: string;
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  deviceId: string | null;
  fingerprint: string;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0];
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return '127.0.0.1';
}

export function extractFingerprint(request: NextRequest): ClientFingerprint {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const acceptLanguage = request.headers.get('accept-language') || 'unknown';
  const acceptEncoding = request.headers.get('accept-encoding') || 'unknown';
  
  const deviceId = request.headers.get('x-device-id') || 
                   request.cookies.get('device_id')?.value || 
                   null;

  const fingerprintData = [
    ip,
    userAgent,
    acceptLanguage,
    acceptEncoding.split(',')[0],
  ].join('|');

  const fingerprint = hashString(fingerprintData);

  return {
    ip,
    userAgent,
    acceptLanguage,
    acceptEncoding,
    deviceId,
    fingerprint,
  };
}

export function getIdentifier(fingerprint: ClientFingerprint, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  if (fingerprint.deviceId) {
    return `device:${fingerprint.deviceId}:${fingerprint.ip}`;
  }

  return `anon:${fingerprint.fingerprint}`;
}

export function isSuspiciousUserAgent(userAgent: string): boolean {
  const suspiciousPatterns = [
    /^$/,
    /curl/i,
    /wget/i,
    /python-requests/i,
    /python-urllib/i,
    /go-http-client/i,
    /java\//i,
    /libwww-perl/i,
    /scrapy/i,
    /node-fetch/i,
    /axios/i,
  ];

  return suspiciousPatterns.some(pattern => pattern.test(userAgent));
}

export function isSuspiciousRequest(request: NextRequest, fingerprint: ClientFingerprint): {
  suspicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (isSuspiciousUserAgent(fingerprint.userAgent)) {
    reasons.push('suspicious_user_agent');
  }

  if (fingerprint.userAgent === 'unknown' || fingerprint.userAgent.length < 10) {
    reasons.push('missing_or_short_user_agent');
  }

  if (fingerprint.acceptLanguage === 'unknown') {
    reasons.push('missing_accept_language');
  }

  const referer = request.headers.get('referer');
  const origin = request.headers.get('origin');
  if (!referer && !origin) {
    reasons.push('missing_referer_and_origin');
  }

  return {
    suspicious: reasons.length >= 2,
    reasons,
  };
}

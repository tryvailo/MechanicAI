import { ABUSE_DETECTION } from './config';
import { store } from './store';
import { ClientFingerprint, isSuspiciousRequest } from './fingerprint';
import { NextRequest } from 'next/server';

export interface AbuseCheckResult {
  blocked: boolean;
  reason?: string;
  retryAfter?: number;
  warning?: boolean;
  warningMessage?: string;
}

export function checkBurstAbuse(identifier: string): AbuseCheckResult {
  const burstCount = store.recordBurst(identifier);

  if (burstCount > ABUSE_DETECTION.burstLimit) {
    store.block(identifier, 'burst_limit_exceeded');
    
    return {
      blocked: true,
      reason: 'Too many requests in a short period. Please slow down.',
      retryAfter: Math.ceil(ABUSE_DETECTION.blockDurationMs / 1000),
    };
  }

  if (burstCount > ABUSE_DETECTION.burstLimit * 0.8) {
    return {
      blocked: false,
      warning: true,
      warningMessage: 'You are approaching the rate limit. Please slow down.',
    };
  }

  return { blocked: false };
}

export function checkSuspiciousActivity(
  request: NextRequest,
  fingerprint: ClientFingerprint
): AbuseCheckResult {
  const suspiciousCheck = isSuspiciousRequest(request, fingerprint);

  if (suspiciousCheck.suspicious) {
    const suspiciousKey = `suspicious:${fingerprint.fingerprint}`;
    const entry = store.getRateLimit(suspiciousKey);

    if (entry && entry.count >= 3) {
      store.block(fingerprint.ip, `suspicious_activity: ${suspiciousCheck.reasons.join(', ')}`);
      
      return {
        blocked: true,
        reason: 'Suspicious activity detected. Access temporarily blocked.',
        retryAfter: Math.ceil(ABUSE_DETECTION.blockDurationMs / 1000),
      };
    }

    store.incrementRateLimit(suspiciousKey, ABUSE_DETECTION.suspiciousWindowMs);
  }

  return { blocked: false };
}

export function isBlocked(identifier: string, ip: string): AbuseCheckResult {
  const identifierBlock = store.isBlocked(identifier);
  if (identifierBlock) {
    const retryAfter = Math.ceil((identifierBlock.expiresAt - Date.now()) / 1000);
    return {
      blocked: true,
      reason: 'Access temporarily blocked due to abuse.',
      retryAfter: Math.max(retryAfter, 0),
    };
  }

  const ipBlock = store.isBlocked(`ip:${ip}`);
  if (ipBlock) {
    const retryAfter = Math.ceil((ipBlock.expiresAt - Date.now()) / 1000);
    return {
      blocked: true,
      reason: 'Access temporarily blocked due to abuse.',
      retryAfter: Math.max(retryAfter, 0),
    };
  }

  return { blocked: false };
}

export function performAbuseCheck(
  request: NextRequest,
  fingerprint: ClientFingerprint,
  identifier: string
): AbuseCheckResult {
  const blockCheck = isBlocked(identifier, fingerprint.ip);
  if (blockCheck.blocked) {
    return blockCheck;
  }

  const suspiciousCheck = checkSuspiciousActivity(request, fingerprint);
  if (suspiciousCheck.blocked) {
    return suspiciousCheck;
  }

  const burstCheck = checkBurstAbuse(identifier);
  if (burstCheck.blocked) {
    return burstCheck;
  }

  if (burstCheck.warning) {
    return burstCheck;
  }

  return { blocked: false };
}

export function blockIdentifier(identifier: string, reason: string, durationMs?: number): void {
  store.block(identifier, reason, durationMs);
}

export function unblockIdentifier(identifier: string): boolean {
  return store.unblock(identifier);
}

export function getAbuseStats(): {
  blockedCount: number;
  burstTrackingCount: number;
} {
  const stats = store.getStats();
  return {
    blockedCount: stats.blockedEntries,
    burstTrackingCount: stats.burstEntries,
  };
}

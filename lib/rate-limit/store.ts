import { ABUSE_DETECTION } from './config';

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface BurstEntry {
  timestamps: number[];
}

export interface BlockedEntry {
  blockedAt: number;
  reason: string;
  expiresAt: number;
}

class InMemoryStore {
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private burstTracking: Map<string, BurstEntry> = new Map();
  private blockedIdentifiers: Map<string, BlockedEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window === 'undefined') {
      this.startCleanup();
    }
  }

  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();

    for (const [key, entry] of this.rateLimits.entries()) {
      if (entry.resetAt < now) {
        this.rateLimits.delete(key);
      }
    }

    for (const [key, entry] of this.burstTracking.entries()) {
      const validTimestamps = entry.timestamps.filter(
        (ts) => now - ts < ABUSE_DETECTION.burstWindowMs
      );
      if (validTimestamps.length === 0) {
        this.burstTracking.delete(key);
      } else {
        entry.timestamps = validTimestamps;
      }
    }

    for (const [key, entry] of this.blockedIdentifiers.entries()) {
      if (entry.expiresAt < now) {
        this.blockedIdentifiers.delete(key);
      }
    }

    if (this.blockedIdentifiers.size > ABUSE_DETECTION.maxBlockedIPs) {
      const entries = Array.from(this.blockedIdentifiers.entries())
        .sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      
      const toRemove = entries.slice(0, entries.length - ABUSE_DETECTION.maxBlockedIPs);
      for (const [key] of toRemove) {
        this.blockedIdentifiers.delete(key);
      }
    }
  }

  getRateLimit(key: string): RateLimitEntry | undefined {
    const entry = this.rateLimits.get(key);
    if (entry && entry.resetAt < Date.now()) {
      this.rateLimits.delete(key);
      return undefined;
    }
    return entry;
  }

  setRateLimit(key: string, entry: RateLimitEntry): void {
    this.rateLimits.set(key, entry);
  }

  incrementRateLimit(key: string, windowMs: number): RateLimitEntry {
    const existing = this.getRateLimit(key);
    const now = Date.now();

    if (existing) {
      existing.count += 1;
      return existing;
    }

    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs,
    };
    this.rateLimits.set(key, newEntry);
    return newEntry;
  }

  recordBurst(identifier: string): number {
    const now = Date.now();
    const entry = this.burstTracking.get(identifier);

    if (entry) {
      entry.timestamps = entry.timestamps.filter(
        (ts) => now - ts < ABUSE_DETECTION.burstWindowMs
      );
      entry.timestamps.push(now);
      return entry.timestamps.length;
    }

    this.burstTracking.set(identifier, { timestamps: [now] });
    return 1;
  }

  isBlocked(identifier: string): BlockedEntry | null {
    const entry = this.blockedIdentifiers.get(identifier);
    if (!entry) return null;

    if (entry.expiresAt < Date.now()) {
      this.blockedIdentifiers.delete(identifier);
      return null;
    }

    return entry;
  }

  block(identifier: string, reason: string, durationMs: number = ABUSE_DETECTION.blockDurationMs): void {
    const now = Date.now();
    this.blockedIdentifiers.set(identifier, {
      blockedAt: now,
      reason,
      expiresAt: now + durationMs,
    });
  }

  unblock(identifier: string): boolean {
    return this.blockedIdentifiers.delete(identifier);
  }

  getStats(): {
    rateLimitEntries: number;
    burstEntries: number;
    blockedEntries: number;
  } {
    return {
      rateLimitEntries: this.rateLimits.size,
      burstEntries: this.burstTracking.size,
      blockedEntries: this.blockedIdentifiers.size,
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const store = new InMemoryStore();

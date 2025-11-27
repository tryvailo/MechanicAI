/**
 * Client-side caching utility for nearby places data.
 * Uses localStorage with automatic TTL expiration.
 * @module lib/utils/locationCache
 */

import type { NearbyPlacesResponse } from '@/lib/config/places';

// Cache storage key prefix
const CACHE_PREFIX = 'nearby_places_cache_';
const CACHE_INDEX_KEY = 'nearby_places_cache_index';

/**
 * Cached data wrapper with metadata
 */
type CachedData<T> = {
  data: T;
  timestamp: number;
  expiresAt: number;
  key: string;
};

/**
 * Cache index for tracking all cached keys
 */
type CacheIndex = {
  keys: string[];
  lastCleanup: number;
};

/**
 * Checks if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates a cache key based on coordinates and radius.
 *
 * @param lat - Latitude (rounded to 4 decimals for ~11m precision)
 * @param lng - Longitude (rounded to 4 decimals)
 * @param radiusMeters - Search radius in meters
 * @returns Cache key string
 *
 * @example
 * ```ts
 * const key = generateCacheKey(50.4501, 30.5234, 5000);
 * // Returns: "50.4501_30.5234_5000"
 * ```
 */
export function generateCacheKey(
  lat: number,
  lng: number,
  radiusMeters: number
): string {
  const roundedLat = Math.round(lat * 10000) / 10000;
  const roundedLng = Math.round(lng * 10000) / 10000;
  return `${roundedLat}_${roundedLng}_${radiusMeters}`;
}

/**
 * Gets the cache index from localStorage
 */
function getCacheIndex(): CacheIndex {
  if (!isLocalStorageAvailable()) {
    return { keys: [], lastCleanup: 0 };
  }

  try {
    const indexData = localStorage.getItem(CACHE_INDEX_KEY);
    if (indexData) {
      return JSON.parse(indexData) as CacheIndex;
    }
  } catch {
    // Ignore parse errors
  }

  return { keys: [], lastCleanup: 0 };
}

/**
 * Saves the cache index to localStorage
 */
function saveCacheIndex(index: CacheIndex): void {
  if (!isLocalStorageAvailable()) return;

  try {
    localStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/**
 * Caches nearby places data with automatic expiration.
 *
 * @param key - Cache key (use generateCacheKey to create)
 * @param data - Places response data to cache
 * @param ttlMinutes - Time to live in minutes (default: 5)
 *
 * @example
 * ```ts
 * const key = generateCacheKey(50.4501, 30.5234, 5000);
 * cacheNearbyPlaces(key, placesResponse, 10); // Cache for 10 minutes
 * ```
 */
export function cacheNearbyPlaces(
  key: string,
  data: NearbyPlacesResponse,
  ttlMinutes: number = 5
): void {
  if (!isLocalStorageAvailable()) return;

  const now = Date.now();
  const expiresAt = now + ttlMinutes * 60 * 1000;

  const cachedData: CachedData<NearbyPlacesResponse> = {
    data,
    timestamp: now,
    expiresAt,
    key,
  };

  try {
    const storageKey = CACHE_PREFIX + key;
    localStorage.setItem(storageKey, JSON.stringify(cachedData));

    // Update cache index
    const index = getCacheIndex();
    if (!index.keys.includes(key)) {
      index.keys.push(key);
      saveCacheIndex(index);
    }
  } catch (error) {
    // Handle quota exceeded by clearing old entries
    if (
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ) {
      clearExpiredCache();
      // Retry once after cleanup
      try {
        localStorage.setItem(
          CACHE_PREFIX + key,
          JSON.stringify(cachedData)
        );
      } catch {
        // Give up if still failing
      }
    }
  }
}

/**
 * Retrieves cached nearby places data if not expired.
 *
 * @param key - Cache key (use generateCacheKey to create)
 * @returns Cached data or null if not found/expired
 *
 * @example
 * ```ts
 * const key = generateCacheKey(50.4501, 30.5234, 5000);
 * const cached = getCachedNearbyPlaces(key);
 * if (cached) {
 *   // Use cached data
 * } else {
 *   // Fetch fresh data
 * }
 * ```
 */
export function getCachedNearbyPlaces(
  key: string
): NearbyPlacesResponse | null {
  if (!isLocalStorageAvailable()) return null;

  try {
    const storageKey = CACHE_PREFIX + key;
    const cached = localStorage.getItem(storageKey);

    if (!cached) return null;

    const parsed = JSON.parse(cached) as CachedData<NearbyPlacesResponse>;

    // Check expiration
    if (Date.now() > parsed.expiresAt) {
      // Remove expired entry
      localStorage.removeItem(storageKey);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * Checks if cached data exists and is still valid.
 *
 * @param key - Cache key
 * @returns True if valid cache exists
 */
export function hasCachedNearbyPlaces(key: string): boolean {
  return getCachedNearbyPlaces(key) !== null;
}

/**
 * Gets cache metadata without the full data.
 *
 * @param key - Cache key
 * @returns Cache info or null
 */
export function getCacheInfo(key: string): {
  timestamp: number;
  expiresAt: number;
  ageMinutes: number;
  remainingMinutes: number;
} | null {
  if (!isLocalStorageAvailable()) return null;

  try {
    const storageKey = CACHE_PREFIX + key;
    const cached = localStorage.getItem(storageKey);

    if (!cached) return null;

    const parsed = JSON.parse(cached) as CachedData<NearbyPlacesResponse>;
    const now = Date.now();

    if (now > parsed.expiresAt) {
      localStorage.removeItem(storageKey);
      return null;
    }

    return {
      timestamp: parsed.timestamp,
      expiresAt: parsed.expiresAt,
      ageMinutes: Math.round((now - parsed.timestamp) / 60000),
      remainingMinutes: Math.round((parsed.expiresAt - now) / 60000),
    };
  } catch {
    return null;
  }
}

/**
 * Clears a specific cache entry.
 *
 * @param key - Cache key to clear
 */
export function clearCacheEntry(key: string): void {
  if (!isLocalStorageAvailable()) return;

  try {
    localStorage.removeItem(CACHE_PREFIX + key);

    // Update index
    const index = getCacheIndex();
    index.keys = index.keys.filter((k) => k !== key);
    saveCacheIndex(index);
  } catch {
    // Ignore errors
  }
}

/**
 * Clears all expired cache entries.
 *
 * @returns Number of entries cleared
 */
export function clearExpiredCache(): number {
  if (!isLocalStorageAvailable()) return 0;

  const index = getCacheIndex();
  const now = Date.now();
  let cleared = 0;

  const validKeys: string[] = [];

  for (const key of index.keys) {
    try {
      const storageKey = CACHE_PREFIX + key;
      const cached = localStorage.getItem(storageKey);

      if (!cached) continue;

      const parsed = JSON.parse(cached) as CachedData<NearbyPlacesResponse>;

      if (now > parsed.expiresAt) {
        localStorage.removeItem(storageKey);
        cleared++;
      } else {
        validKeys.push(key);
      }
    } catch {
      // Remove invalid entries
      try {
        localStorage.removeItem(CACHE_PREFIX + key);
      } catch {
        // Ignore
      }
      cleared++;
    }
  }

  // Update index with only valid keys
  index.keys = validKeys;
  index.lastCleanup = now;
  saveCacheIndex(index);

  return cleared;
}

/**
 * Clears all nearby places cache entries.
 *
 * @returns Number of entries cleared
 */
export function clearAllCache(): number {
  if (!isLocalStorageAvailable()) return 0;

  const index = getCacheIndex();
  let cleared = 0;

  for (const key of index.keys) {
    try {
      localStorage.removeItem(CACHE_PREFIX + key);
      cleared++;
    } catch {
      // Ignore errors
    }
  }

  // Clear index
  try {
    localStorage.removeItem(CACHE_INDEX_KEY);
  } catch {
    // Ignore errors
  }

  return cleared;
}

/**
 * Gets statistics about the cache.
 *
 * @returns Cache statistics
 */
export function getCacheStats(): {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  estimatedSizeKB: number;
} {
  if (!isLocalStorageAvailable()) {
    return {
      totalEntries: 0,
      validEntries: 0,
      expiredEntries: 0,
      estimatedSizeKB: 0,
    };
  }

  const index = getCacheIndex();
  const now = Date.now();
  let validEntries = 0;
  let expiredEntries = 0;
  let totalSize = 0;

  for (const key of index.keys) {
    try {
      const storageKey = CACHE_PREFIX + key;
      const cached = localStorage.getItem(storageKey);

      if (!cached) continue;

      totalSize += cached.length * 2; // Rough estimate (2 bytes per char)

      const parsed = JSON.parse(cached) as CachedData<NearbyPlacesResponse>;

      if (now > parsed.expiresAt) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    } catch {
      expiredEntries++;
    }
  }

  return {
    totalEntries: index.keys.length,
    validEntries,
    expiredEntries,
    estimatedSizeKB: Math.round(totalSize / 1024),
  };
}

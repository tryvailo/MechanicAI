'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Geolocation coordinates
 */
export type Coordinates = {
  lat: number;
  lng: number;
};

/**
 * Geolocation permission state
 */
export type GeolocationPermission = 'prompt' | 'granted' | 'denied' | 'unavailable';

/**
 * Geolocation hook return type
 */
export type UseGeolocationResult = {
  /** Current coordinates or null if not available */
  coords: Coordinates | null;
  /** Loading state during geolocation request */
  loading: boolean;
  /** Error message in Russian or null if no error */
  error: string | null;
  /** Current permission state */
  permission: GeolocationPermission;
  /** Timestamp of last successful location update */
  timestamp: number | null;
  /** Request or retry geolocation permission */
  requestPermission: () => void;
  /** Clear cached location and error state */
  reset: () => void;
};

/**
 * Hook configuration options
 */
export type UseGeolocationOptions = {
  /** Request location on mount (default: true) */
  enableOnMount?: boolean;
  /** Location cache duration in ms (default: 5 minutes) */
  cacheDuration?: number;
  /** Request timeout in ms (default: 10 seconds) */
  timeout?: number;
  /** Use high accuracy GPS (default: true) */
  enableHighAccuracy?: boolean;
  /** Maximum age of cached position in ms (default: 1 minute) */
  maximumAge?: number;
};

// Default options
const DEFAULT_OPTIONS: Required<UseGeolocationOptions> = {
  enableOnMount: true,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
  timeout: 20 * 1000, // 20 seconds (increased for better reliability, especially on iOS)
  enableHighAccuracy: true,
  maximumAge: 60 * 1000, // 1 minute
};

// Cache key for localStorage
const CACHE_KEY = 'geolocation_cache';

// Error messages
const ERROR_MESSAGES: Record<string, string> = {
  PERMISSION_DENIED: 'Location access denied. Please enable location in browser settings.',
  POSITION_UNAVAILABLE: 'Unable to determine location. Check GPS and internet connection.',
  TIMEOUT: 'Location request timed out. Try again in a location with better GPS signal.',
  NOT_SUPPORTED: 'Geolocation is not supported by your browser.',
  UNKNOWN: 'An unknown error occurred while determining location.',
};

type CachedLocation = {
  coords: Coordinates;
  timestamp: number;
};

function getCachedLocation(cacheDuration: number): CachedLocation | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedLocation = JSON.parse(cached);
    const now = Date.now();

    if (now - parsed.timestamp < cacheDuration) {
      return parsed;
    }

    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

function setCachedLocation(coords: Coordinates): void {
  if (typeof window === 'undefined') return;

  try {
    const data: CachedLocation = {
      coords,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore localStorage errors
  }
}

function clearCachedLocation(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Custom hook for reliable geolocation handling.
 *
 * @param options - Configuration options
 * @returns Geolocation state and control functions
 *
 * @example
 * ```tsx
 * function LocationComponent() {
 *   const { coords, loading, error, requestPermission } = useGeolocation();
 *
 *   if (loading) return <Spinner />;
 *   if (error) return <ErrorMessage message={error} onRetry={requestPermission} />;
 *   if (!coords) return <Button onClick={requestPermission}>Определить местоположение</Button>;
 *
 *   return <Map center={coords} />;
 * }
 * ```
 */
export function useGeolocation(
  options: UseGeolocationOptions = {}
): UseGeolocationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<GeolocationPermission>('prompt');
  const [timestamp, setTimestamp] = useState<number | null>(null);

  const isMounted = useRef(true);
  const watchId = useRef<number | null>(null);

  // Check for cached location on mount
  useEffect(() => {
    const cached = getCachedLocation(opts.cacheDuration);
    if (cached) {
      setCoords(cached.coords);
      setTimestamp(cached.timestamp);
      setPermission('granted');
    }
  }, [opts.cacheDuration]);

  // Check permission state
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions) return;

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        if (!isMounted.current) return;

        if (result.state === 'granted') setPermission('granted');
        else if (result.state === 'denied') setPermission('denied');
        else setPermission('prompt');

        result.addEventListener('change', () => {
          if (!isMounted.current) return;
          if (result.state === 'granted') setPermission('granted');
          else if (result.state === 'denied') setPermission('denied');
          else setPermission('prompt');
        });
      })
      .catch(() => {
        // Permissions API not supported, continue with prompt state
      });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const requestPermission = useCallback(() => {
    // Check if geolocation is supported
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError(ERROR_MESSAGES.NOT_SUPPORTED);
      setPermission('unavailable');
      return;
    }

    // Check for recent cache
    const cached = getCachedLocation(opts.cacheDuration);
    if (cached) {
      setCoords(cached.coords);
      setTimestamp(cached.timestamp);
      setPermission('granted');
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let retryCount = 0;
    const maxRetries = 2; // Try up to 3 times total (initial + 2 retries)

    // First try with high accuracy
    const tryGetLocation = (useHighAccuracy: boolean, attemptNumber: number = 0) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isMounted.current) return;

          const newCoords: Coordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          setCoords(newCoords);
          setTimestamp(Date.now());
          setPermission('granted');
          setError(null);
          setLoading(false);

          setCachedLocation(newCoords);
        },
        (err) => {
          if (!isMounted.current) return;

          // If high accuracy failed with POSITION_UNAVAILABLE, try with low accuracy
          if (useHighAccuracy && err.code === err.POSITION_UNAVAILABLE && attemptNumber === 0) {
            console.log('High accuracy failed, trying low accuracy...');
            tryGetLocation(false, 0);
            return;
          }

          // Retry logic for POSITION_UNAVAILABLE and TIMEOUT errors
          if (
            retryCount < maxRetries &&
            (err.code === err.POSITION_UNAVAILABLE || err.code === err.TIMEOUT)
          ) {
            retryCount++;
            const delay = 1000 * retryCount; // Exponential backoff: 1s, 2s
            console.log(`Location error (${err.code}), retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})...`);
            
            setTimeout(() => {
              if (isMounted.current) {
                tryGetLocation(false, retryCount);
              }
            }, delay);
            return;
          }

          let errorMessage: string;

          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = ERROR_MESSAGES.PERMISSION_DENIED;
              setPermission('denied');
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = ERROR_MESSAGES.POSITION_UNAVAILABLE + 
                ' Make sure you are in an area with GPS signal or have internet connection for network-based location.';
              break;
            case err.TIMEOUT:
              errorMessage = ERROR_MESSAGES.TIMEOUT + 
                ' Try moving to an area with better GPS signal or check your internet connection.';
              break;
            default:
              errorMessage = ERROR_MESSAGES.UNKNOWN;
          }

          setError(errorMessage);
          setLoading(false);
        },
        {
          enableHighAccuracy: useHighAccuracy,
          timeout: opts.timeout,
          maximumAge: opts.maximumAge,
        }
      );
    };

    retryCount = 0; // Reset retry counter
    tryGetLocation(opts.enableHighAccuracy, 0);
  }, [opts.cacheDuration, opts.enableHighAccuracy, opts.timeout, opts.maximumAge]);

  // Request location on mount if enabled
  useEffect(() => {
    if (opts.enableOnMount && !coords) {
      requestPermission();
    }
  }, [opts.enableOnMount, coords, requestPermission]);

  const reset = useCallback(() => {
    setCoords(null);
    setError(null);
    setTimestamp(null);
    setPermission('prompt');
    clearCachedLocation();
  }, []);

  return {
    coords,
    loading,
    error,
    permission,
    timestamp,
    requestPermission,
    reset,
  };
}

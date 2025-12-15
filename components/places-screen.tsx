'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, RefreshCw, Navigation, AlertCircle, SlidersHorizontal, Search, X, Route, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  NearbyPlacesMap,
  type CarRepairPlace,
  type ParkingPlace,
} from '@/components/nearby-places-map';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { cn } from '@/lib/utils';
import { formatDuration, formatDistance } from '@/lib/utils/price-level';
import type { PageTab } from './types';

type PlacesFilter = {
  carRepairs: boolean;
  parkings: boolean;
};

type DestinationInfo = {
  address: string;
  lat: number;
  lng: number;
};

type RouteInfo = {
  distance: number;
  duration: string;
  encodedPolyline: string;
};

interface PlacesScreenProps {
  onNavigate: (tab: PageTab) => void;
}

export default function PlacesScreen({ onNavigate }: PlacesScreenProps) {
  const {
    coords: userLocation,
    loading: geoLoading,
    error: geoError,
    permission,
    requestPermission,
  } = useGeolocation();

  const [radiusKm, setRadiusKm] = useState(5);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);

  const [carRepairs, setCarRepairs] = useState<CarRepairPlace[]>([]);
  const [parkings, setParkings] = useState<ParkingPlace[]>([]);

  const [filter, setFilter] = useState<PlacesFilter>({
    carRepairs: true,
    parkings: true,
  });

  const [showRadiusSlider, setShowRadiusSlider] = useState(false);
  
  // Destination search state
  const [destinationQuery, setDestinationQuery] = useState('');
  const [destination, setDestination] = useState<DestinationInfo | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isSearchingDestination, setIsSearchingDestination] = useState(false);
  const [destinationParkings, setDestinationParkings] = useState<ParkingPlace[]>([]);
  const [showDestinationMode, setShowDestinationMode] = useState(false);

  const isLocationGranted = permission === 'granted' && userLocation !== null;
  const isLocationPending = geoLoading;
  const isLocationDenied = permission === 'denied' || permission === 'unavailable' || geoError !== null;

  // Ref to track current fetch and allow cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const isMountedRef = useRef(true);

  // Track component mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Cancel any pending requests on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Single fetch function used by both auto-fetch and manual refresh
  useEffect(() => {
    if (!isLocationGranted || !userLocation) return;
    if (!isMountedRef.current) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    let isMounted = true;

    const fetchPlaces = async () => {
      const placeTypes: string[] = [];
      if (filter.carRepairs) placeTypes.push('car_repair');
      if (filter.parkings) placeTypes.push('parking');

      if (placeTypes.length === 0) {
        if (isMounted) {
          setCarRepairs([]);
          setParkings([]);
        }
        return;
      }

      if (isMounted) {
        setIsLoadingPlaces(true);
        setPlacesError(null);
      }

      try {
        const response = await fetch('/api/nearby-places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: userLocation.lat,
            longitude: userLocation.lng,
            radiusMeters: radiusKm * 1000,
            placeTypes,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Error ${response.status}`);
        }

        const data = await response.json();
        
        if (isMounted) {
          setCarRepairs(data.carRepairs || []);
          setParkings(data.parkings || []);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Ignore abort errors
        }
        console.error('Failed to fetch nearby places:', error);
        if (isMounted) {
          setPlacesError(
            error instanceof Error ? error.message : 'Failed to load places'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingPlaces(false);
        }
      }
    };

    fetchPlaces();

    return () => {
      isMounted = false;
      if (!abortController.signal.aborted) {
        abortController.abort();
      }
    };
  }, [isLocationGranted, userLocation, radiusKm, filter, fetchTrigger]);

  // Manual refresh function - just triggers the effect
  const fetchNearbyPlaces = useCallback(() => {
    setFetchTrigger(prev => prev + 1);
  }, []);

  const toggleFilter = (key: keyof PlacesFilter) => {
    setFilter((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRadiusChange = (value: number[]) => {
    const newRadius = value[0];
    console.log('Slider value changed:', { old: radiusKm, new: newRadius, value });
    setRadiusKm(newRadius);
  };

  // Search for destination and calculate route
  const searchDestination = useCallback(async () => {
    if (!destinationQuery.trim() || !userLocation) return;

    setIsSearchingDestination(true);
    try {
      // Use Google Geocoding via Places API to get destination coordinates
      const geocodeResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(destinationQuery)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const geocodeData = await geocodeResponse.json();

      if (geocodeData.results && geocodeData.results.length > 0) {
        const result = geocodeData.results[0];
        const destInfo: DestinationInfo = {
          address: result.formatted_address,
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        };
        setDestination(destInfo);

        // Get route from user to destination
        const directionsResponse = await fetch('/api/directions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: { lat: userLocation.lat, lng: userLocation.lng },
            destination: { lat: destInfo.lat, lng: destInfo.lng },
          }),
        });
        const directionsData = await directionsResponse.json();

        if (directionsData.routes && directionsData.routes.length > 0) {
          const route = directionsData.routes[0];
          setRouteInfo({
            distance: route.distanceMeters,
            duration: route.duration,
            encodedPolyline: route.polyline?.encodedPolyline || '',
          });
        }

        // Search for parkings near destination
        const parkingsResponse = await fetch('/api/nearby-places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: destInfo.lat,
            longitude: destInfo.lng,
            radiusMeters: 1000, // 1km around destination
            placeTypes: ['parking'],
          }),
        });
        const parkingsData = await parkingsResponse.json();
        setDestinationParkings(parkingsData.parkings || []);
        setShowDestinationMode(true);
      }
    } catch (error) {
      console.error('Failed to search destination:', error);
    } finally {
      setIsSearchingDestination(false);
    }
  }, [destinationQuery, userLocation]);

  // Clear destination mode
  const clearDestination = useCallback(() => {
    setDestination(null);
    setRouteInfo(null);
    setDestinationParkings([]);
    setDestinationQuery('');
    setShowDestinationMode(false);
  }, []);

  const filteredCarRepairs = filter.carRepairs ? carRepairs : [];
  const filteredParkings = filter.parkings ? (showDestinationMode ? destinationParkings : parkings) : [];

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 border-b bg-card px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#21808D]/10 sm:h-9 sm:w-9">
              <MapPin className="h-4 w-4 text-[#21808D] sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-semibold text-base sm:text-lg">Nearby Services</h1>
              {isLocationGranted && (
                <p className="truncate text-muted-foreground text-xs">
                  Radius: {radiusKm} km
                </p>
              )}
            </div>
          </div>

          {isLocationGranted && (
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowRadiusSlider(!showRadiusSlider)}
                className={cn('h-8 w-8 sm:h-9 sm:w-9', showRadiusSlider && 'bg-accent')}
              >
                <SlidersHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchNearbyPlaces}
                disabled={isLoadingPlaces}
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <RefreshCw
                  className={cn('h-4 w-4 sm:h-5 sm:w-5', isLoadingPlaces && 'animate-spin')}
                />
              </Button>
            </div>
          )}
        </div>

        {/* Destination Search */}
        {isLocationGranted && (
          <div className="mt-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Where are you going? (e.g., Berlin Hauptbahnhof)"
                  value={destinationQuery}
                  onChange={(e) => setDestinationQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchDestination()}
                  className="pl-8 pr-8 h-9 text-sm"
                  disabled={isSearchingDestination}
                />
                {destinationQuery && (
                  <button
                    onClick={() => setDestinationQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                onClick={searchDestination}
                disabled={!destinationQuery.trim() || isSearchingDestination}
                className="h-9 gap-1.5 bg-[#21808D] hover:bg-[#21808D]/90"
              >
                <Route className="h-4 w-4" />
                <span className="hidden sm:inline">Find Parking</span>
              </Button>
            </div>

            {/* Destination Info */}
            {showDestinationMode && destination && (
              <div className="mt-2 rounded-lg bg-[#21808D]/10 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#21808D] truncate">
                      📍 {destination.address}
                    </p>
                    {routeInfo && (
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Route className="h-3 w-3" />
                          {formatDistance(routeInfo.distance)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(routeInfo.duration)}
                        </span>
                        <span className="text-[#21808D]">
                          🅿️ {destinationParkings.length} parkings nearby
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearDestination}
                    className="h-7 px-2 text-xs"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Radius Slider */}
        {showRadiusSlider && isLocationGranted && !showDestinationMode && (
          <div className="mt-3 rounded-lg bg-muted/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm">Search radius</span>
              <Badge variant="secondary">{radiusKm} km</Badge>
            </div>
            <Slider
              value={[radiusKm]}
              onValueChange={handleRadiusChange}
              min={1}
              max={15}
              step={1}
              className="w-full"
            />
            <div className="mt-1 flex justify-between text-muted-foreground text-xs">
              <span>1 km</span>
              <span>15 km</span>
            </div>
          </div>
        )}

        {/* Filter Chips */}
        {isLocationGranted && (
          <div className="mt-2.5 flex flex-wrap gap-2 sm:mt-3">
            <button
              onClick={() => toggleFilter('carRepairs')}
              className={cn(
                'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-all sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm',
                filter.carRepairs
                  ? 'border-[#21808D] bg-[#21808D]/10 text-[#21808D]'
                  : 'border-border bg-background text-muted-foreground'
              )}
            >
              <span className="text-sm sm:text-base">🔧</span>
              <span className="hidden xs:inline">Car </span>Repair
              {filter.carRepairs && (
                <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px] sm:ml-1 sm:h-5 sm:px-1.5 sm:text-xs">
                  {carRepairs.length}
                </Badge>
              )}
            </button>

            <button
              onClick={() => toggleFilter('parkings')}
              className={cn(
                'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-all sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm',
                filter.parkings
                  ? 'border-gray-500 bg-gray-500/10 text-gray-700 dark:text-gray-300'
                  : 'border-border bg-background text-muted-foreground'
              )}
            >
              <span className="text-sm sm:text-base">🅿️</span>
              Parking
              {filter.parkings && (
                <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px] sm:ml-1 sm:h-5 sm:px-1.5 sm:text-xs">
                  {parkings.length}
                </Badge>
              )}
            </button>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Pending state */}
        {isLocationPending && (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 h-12 w-12 animate-pulse rounded-full bg-[#21808D]/20" />
            <p className="text-muted-foreground">Detecting location...</p>
          </div>
        )}

        {/* Denied / Error / Unavailable state */}
        {isLocationDenied && !isLocationPending && (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="mb-2 font-semibold text-lg">Location Unavailable</h2>
            <p className="mb-4 max-w-xs text-muted-foreground text-sm">{geoError}</p>
            <div className="mb-6 max-w-xs space-y-2 text-left text-muted-foreground text-xs">
              <p className="font-medium">Troubleshooting tips:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>Allow location access in your browser settings</li>
                <li>Check that GPS is enabled on your device</li>
                <li>Try moving to an area with better GPS signal</li>
                <li>Ensure you have an internet connection</li>
              </ul>
            </div>
            <Button onClick={requestPermission} className="gap-2 bg-[#21808D] hover:bg-[#21808D]/90">
              <Navigation className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        )}

        {/* Granted state - show map */}
        {isLocationGranted && userLocation && (
          <div className="h-full overflow-hidden">
            {placesError ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="mb-2 h-8 w-8 text-destructive" />
                <h3 className="font-medium text-destructive">Loading Error</h3>
                <p className="mt-1 text-muted-foreground text-sm">{placesError}</p>
                <Button
                  onClick={fetchNearbyPlaces}
                  variant="outline"
                  className="mt-4"
                  disabled={isLoadingPlaces}
                >
                  <RefreshCw className={cn('mr-2 h-4 w-4', isLoadingPlaces && 'animate-spin')} />
                  Retry
                </Button>
              </div>
            ) : (
              <NearbyPlacesMap
                carRepairs={showDestinationMode ? [] : filteredCarRepairs}
                parkings={filteredParkings}
                userLocation={userLocation}
                destination={destination}
                routePolyline={routeInfo?.encodedPolyline}
                isLoading={isLoadingPlaces || isSearchingDestination}
                error={null}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

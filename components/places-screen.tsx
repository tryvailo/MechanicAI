'use client';

import { useCallback, useEffect, useState } from 'react';
import { MapPin, RefreshCw, Navigation, AlertCircle, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  NearbyPlacesMap,
  type CarRepairPlace,
  type ParkingPlace,
} from '@/components/nearby-places-map';
import { useGeolocation } from '@/lib/hooks/useGeolocation';
import { cn } from '@/lib/utils';
import type { PageTab } from './types';

type PlacesFilter = {
  carRepairs: boolean;
  parkings: boolean;
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

  const isLocationGranted = permission === 'granted' && userLocation !== null;
  const isLocationPending = geoLoading;
  const isLocationDenied = permission === 'denied' || permission === 'unavailable' || geoError !== null;

  const fetchNearbyPlaces = useCallback(async () => {
    if (!userLocation) return;

    setIsLoadingPlaces(true);
    setPlacesError(null);

    const placeTypes: string[] = [];
    if (filter.carRepairs) placeTypes.push('car_repair');
    if (filter.parkings) placeTypes.push('parking');

    if (placeTypes.length === 0) {
      setCarRepairs([]);
      setParkings([]);
      setIsLoadingPlaces(false);
      return;
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
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const data = await response.json();
      setCarRepairs(data.carRepairs || []);
      setParkings(data.parkings || []);
    } catch (error) {
      console.error('Failed to fetch nearby places:', error);
      setPlacesError(
        error instanceof Error ? error.message : 'Failed to load places'
      );
    } finally {
      setIsLoadingPlaces(false);
    }
  }, [userLocation, radiusKm, filter]);

  useEffect(() => {
    if (isLocationGranted) {
      fetchNearbyPlaces();
    }
  }, [isLocationGranted, userLocation, radiusKm, filter, fetchNearbyPlaces]);

  const toggleFilter = (key: keyof PlacesFilter) => {
    setFilter((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRadiusChange = (value: number[]) => {
    setRadiusKm(value[0]);
  };

  const filteredCarRepairs = filter.carRepairs ? carRepairs : [];
  const filteredParkings = filter.parkings ? parkings : [];

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

        {/* Radius Slider */}
        {showRadiusSlider && isLocationGranted && (
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
              {filter.carRepairs && carRepairs.length > 0 && (
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
              {filter.parkings && parkings.length > 0 && (
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
                carRepairs={filteredCarRepairs}
                parkings={filteredParkings}
                userLocation={userLocation}
                isLoading={isLoadingPlaces}
                error={null}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

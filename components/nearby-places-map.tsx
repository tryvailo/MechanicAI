'use client';

/// <reference types="google.maps" />

import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Star, Wrench, Car } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Types
export type CarRepairPlace = {
  id: string;
  name: string;
  rating: number | null;
  reviewCount: number;
  address: string;
  lat: number;
  lng: number;
  mapsUri: string;
  priceLevel: string | null;
  websiteUri: string | null;
  distance: number;
};

export type ParkingPlace = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  mapsUri: string;
  distance: number;
};

export type UserLocation = {
  lat: number;
  lng: number;
};

type NearbyPlacesMapProps = {
  carRepairs: CarRepairPlace[];
  parkings: ParkingPlace[];
  userLocation: UserLocation;
  isLoading?: boolean;
  error?: string | null;
};

// Global flag to prevent multiple script loads
let googleMapsScriptLoading = false;
let googleMapsScriptLoaded = false;
const googleMapsLoadCallbacks: Array<() => void> = [];

// Google Maps Script Loader Hook
function useGoogleMapsScript(apiKey: string, mapId?: string) {
  const [isLoaded, setIsLoaded] = useState(googleMapsScriptLoaded);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Already loaded
    if (window.google?.maps?.Map) {
      googleMapsScriptLoaded = true;
      setIsLoaded(true);
      return;
    }

    // Already loading - register callback
    if (googleMapsScriptLoading) {
      const callback = () => setIsLoaded(true);
      googleMapsLoadCallbacks.push(callback);
      return () => {
        const index = googleMapsLoadCallbacks.indexOf(callback);
        if (index > -1) googleMapsLoadCallbacks.splice(index, 1);
      };
    }

    // Check for existing script
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    ) as HTMLScriptElement | null;

    if (existingScript) {
      if (window.google?.maps?.Map) {
        googleMapsScriptLoaded = true;
        setIsLoaded(true);
      } else {
        const onLoad = () => {
          googleMapsScriptLoaded = true;
          setIsLoaded(true);
        };
        existingScript.addEventListener('load', onLoad);
        return () => existingScript.removeEventListener('load', onLoad);
      }
      return;
    }

    // Load script
    googleMapsScriptLoading = true;
    console.log('Loading Google Maps script with API key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');

    const script = document.createElement('script');
    // Load marker library if mapId is configured (for AdvancedMarkerElement)
    // DirectionsService and DirectionsRenderer are available in the main API, no separate library needed
    const libraries = mapId ? 'marker' : '';
    const url = libraries
      ? `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libraries}&loading=async`
      : `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
    script.src = url;
    script.async = true;

    script.onload = () => {
      console.log('Google Maps script loaded successfully');
      
      // Wait for Google Maps API to be fully initialized
      // With loading=async, the API might not be ready immediately
      const checkApiReady = (attempts = 0) => {
        if (typeof window !== 'undefined' && window.google?.maps?.Map) {
          console.log('Google Maps API is ready:', {
            hasMap: !!window.google.maps.Map,
            hasMarker: !!window.google.maps.marker,
          });
          googleMapsScriptLoaded = true;
          googleMapsScriptLoading = false;
          setIsLoaded(true);
          googleMapsLoadCallbacks.forEach((cb) => cb());
          googleMapsLoadCallbacks.length = 0;
        } else if (attempts < 20) {
          // Retry up to 20 times (2 seconds total)
          setTimeout(() => checkApiReady(attempts + 1), 100);
        } else {
          console.error('Google Maps API failed to initialize after script load');
          googleMapsScriptLoading = false;
          setLoadError('Google Maps API failed to initialize. Please check your API key and network connection.');
        }
      };
      
      checkApiReady();
    };

    script.onerror = (error) => {
      console.error('Failed to load Google Maps script:', error);
      googleMapsScriptLoading = false;
      setLoadError('Failed to load Google Maps. Check your API key and network connection.');
    };

    document.head.appendChild(script);
  }, [apiKey, mapId]);

  return { isLoaded, loadError };
}

// Marker icon paths (using public folder SVGs)
const MARKER_ICONS = {
  carRepair: '/markers/car-repair-marker.svg',
  parking: '/markers/parking-marker.svg',
  user: '/markers/user-marker.svg',
} as const;

// Place List Item Component
function PlaceListItem({
  place,
  type,
  isSelected,
  onClick,
  onRouteClick,
}: {
  place: CarRepairPlace | ParkingPlace;
  type: 'car_repair' | 'parking';
  isSelected: boolean;
  onClick: () => void;
  onRouteClick: () => void;
}) {
  const isCarRepair = type === 'car_repair';
  const carRepair = isCarRepair ? (place as CarRepairPlace) : null;

  const handleRouteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRouteClick();
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition-all hover:bg-accent active:bg-accent/80 sm:gap-3 sm:p-3',
        isSelected && 'border-[#21808D] bg-[#21808D]/5'
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8',
          isCarRepair ? 'bg-[#21808D]/10 text-[#21808D]' : 'bg-gray-100 text-gray-600 dark:bg-gray-800'
        )}
      >
        {isCarRepair ? <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Car className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
          <h4 className="truncate font-medium text-xs leading-tight sm:text-sm">{place.name}</h4>
          {carRepair?.rating && (
            <Badge variant="secondary" className="shrink-0 gap-0.5 bg-amber-100 px-1 py-0 text-[10px] text-amber-700 sm:gap-1 sm:px-1.5 sm:py-0.5 sm:text-xs">
              <Star className="h-2.5 w-2.5 fill-current sm:h-3 sm:w-3" />
              {carRepair.rating.toFixed(1)}
            </Badge>
          )}
        </div>

        <p className="mt-0.5 line-clamp-1 text-muted-foreground text-[11px] sm:text-xs">{place.address}</p>

        <div className="mt-1.5 flex items-center justify-between sm:mt-2">
          <span className="text-muted-foreground text-[11px] sm:text-xs">
            <MapPin className="mr-0.5 inline h-2.5 w-2.5 sm:mr-1 sm:h-3 sm:w-3" />
            {place.distance} km
          </span>

          <Button
            size="sm"
            variant="ghost"
            className="h-6 gap-0.5 px-1.5 text-[#21808D] text-[11px] hover:bg-[#21808D]/10 hover:text-[#21808D] sm:h-7 sm:gap-1 sm:px-2 sm:text-xs"
            onClick={handleRouteClick}
          >
            <Navigation className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            Route
          </Button>
        </div>
      </div>
    </div>
  );
}

// Loading Skeleton
function MapSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <Skeleton className="h-[40vh] w-full rounded-lg md:h-[50vh]" />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

// Error Display
function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="flex h-[40vh] flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
      <div className="mb-2 text-destructive text-4xl">⚠️</div>
      <h3 className="font-medium text-destructive">Loading Error</h3>
      <p className="mt-1 text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

// Main Component
export function NearbyPlacesMap({
  carRepairs,
  parkings,
  userLocation,
  isLoading = false,
  error = null,
}: NearbyPlacesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Array<google.maps.Marker | google.maps.marker.AdvancedMarkerElement>>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'car_repair' | 'parking'>('car_repair');
  const [isRouteActive, setIsRouteActive] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || '';
  const { isLoaded: mapsLoaded, loadError: mapsError } = useGoogleMapsScript(apiKey, mapId);

  // Initialize map function
  const initializeMap = useCallback((container: HTMLDivElement) => {
    if (googleMapRef.current || !window.google?.maps?.Map) {
      return;
    }

    console.log('Initializing Google Map...');
    
    const mapOptions: google.maps.MapOptions = {
      center: userLocation,
      zoom: 14,
      disableDefaultUI: false,
      zoomControl: true,
      fullscreenControl: true,
      streetViewControl: false,
      mapTypeControl: false,
    };

    // Add mapId if configured (required for AdvancedMarkerElement)
    if (mapId) {
      mapOptions.mapId = mapId;
    }

    try {
      googleMapRef.current = new window.google.maps.Map(container, mapOptions);
      console.log('Google Map initialized successfully', mapId ? `(with mapId: ${mapId})` : '(without mapId, using standard markers)');
    } catch (error: any) {
      console.error('Failed to initialize Google Map:', error);
      
      // Check if it's an API activation error
      if (error?.message?.includes('ApiNotActivatedMapError') || 
          error?.message?.includes('ApiNotActivated')) {
        console.warn('Maps JavaScript API may not be activated. Trying basic initialization...');
        // Try with minimal options
        try {
          googleMapRef.current = new window.google.maps.Map(container, {
            center: userLocation,
            zoom: 14,
          });
          console.log('Google Map initialized with minimal options');
        } catch (minimalError) {
          console.error('Failed to initialize Google Map with minimal options:', minimalError);
          return;
        }
      } else {
        return;
      }
    }

    if (window.google?.maps?.InfoWindow) {
      infoWindowRef.current = new window.google.maps.InfoWindow();
    }

    // Initialize Directions Service and Renderer
    if (window.google?.maps?.DirectionsService && window.google?.maps?.DirectionsRenderer) {
      directionsServiceRef.current = new window.google.maps.DirectionsService();
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: googleMapRef.current,
        suppressMarkers: false,
        preserveViewport: false,
      });
    }

    // Add user location marker
    if (googleMapRef.current) {
      if (mapId && window.google?.maps?.marker?.AdvancedMarkerElement) {
        // Use AdvancedMarkerElement if mapId is configured
        try {
          const userMarkerImg = document.createElement('img');
          userMarkerImg.src = MARKER_ICONS.user;
          userMarkerImg.style.width = '24px';
          userMarkerImg.style.height = '24px';

          new window.google.maps.marker.AdvancedMarkerElement({
            map: googleMapRef.current,
            position: userLocation,
            content: userMarkerImg,
            title: 'Your location',
          });
        } catch (error) {
          console.warn('AdvancedMarkerElement failed, using standard Marker:', error);
          // Fallback to standard Marker
          new window.google.maps.Marker({
            map: googleMapRef.current,
            position: userLocation,
            title: 'Your location',
            icon: {
              url: MARKER_ICONS.user,
              scaledSize: new window.google.maps.Size(24, 24),
            },
          });
        }
      } else {
        // Use standard Marker (works without mapId)
        new window.google.maps.Marker({
          map: googleMapRef.current,
          position: userLocation,
          title: 'Your location',
          icon: {
            url: MARKER_ICONS.user,
            scaledSize: new window.google.maps.Size(24, 24),
          },
        });
      }
    }

    // Trigger resize to ensure map renders correctly
    setTimeout(() => {
      if (googleMapRef.current && window.google?.maps?.event) {
        window.google.maps.event.trigger(googleMapRef.current, 'resize');
      }
    }, 100);
  }, [userLocation]);

  // Callback ref to ensure we capture the element
  const setMapContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      mapContainerRef.current = node;
      mapRef.current = node;
      // Try to initialize map if all conditions are met
      if (mapsLoaded && !googleMapRef.current && window.google?.maps?.Map) {
        console.log('Initializing map from callback ref');
        setTimeout(() => initializeMap(node), 100);
      }
    } else {
      // Node is being unmounted - don't clear refs if map is still valid
      if (!googleMapRef.current) {
        mapContainerRef.current = null;
        mapRef.current = null;
      }
    }
  }, [mapsLoaded, initializeMap]);

  // Debug logging
  useEffect(() => {
    console.log('Map Debug:', {
      apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING',
      mapsLoaded,
      mapsError,
      hasMapRef: !!mapContainerRef.current,
      hasGoogleMap: !!googleMapRef.current,
      userLocation,
    });
  }, [apiKey, mapsLoaded, mapsError, userLocation]);

  // Initialize map when conditions are met
  useEffect(() => {
    if (!mapsLoaded || !mapContainerRef.current || googleMapRef.current) {
      return;
    }

    if (!window.google?.maps?.Map) {
      console.warn('Google Maps API not available, waiting...');
      return;
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (mapContainerRef.current && !googleMapRef.current) {
        initializeMap(mapContainerRef.current);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [mapsLoaded, initializeMap]);

  // Create info window content
  const createInfoWindowContent = useCallback(
    (place: CarRepairPlace | ParkingPlace, type: 'car_repair' | 'parking') => {
      const isCarRepair = type === 'car_repair';
      const carRepair = isCarRepair ? (place as CarRepairPlace) : null;
      const routeUrl =
        place.mapsUri ||
        `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;

      return `
      <div style="max-width: 250px; padding: 8px;">
        <h3 style="margin: 0 0 4px; font-weight: 600; font-size: 14px;">${place.name}</h3>
        ${
          carRepair?.rating
            ? `<div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                <span style="color: #F59E0B;">★</span>
                <span style="font-size: 13px;">${carRepair.rating.toFixed(1)}</span>
                <span style="color: #6B7280; font-size: 12px;">(${carRepair.reviewCount})</span>
              </div>`
            : ''
        }
        <p style="margin: 0 0 8px; color: #6B7280; font-size: 12px;">${place.address}</p>
        <a href="${routeUrl}" target="_blank" rel="noopener noreferrer"
           style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px;
                  background: #21808D; color: white; border-radius: 6px; font-size: 12px;
                  text-decoration: none; font-weight: 500;">
          Route
        </a>
      </div>
    `;
    },
    []
  );

  // Add markers for places
  useEffect(() => {
    if (!mapsLoaded || !googleMapRef.current) {
      console.log('Markers not added:', { mapsLoaded, hasMap: !!googleMapRef.current });
      return;
    }

    // Clear existing markers
    markersRef.current.forEach((marker) => {
      if (marker instanceof window.google.maps.Marker) {
        marker.setMap(null);
      } else if ('map' in marker) {
        marker.map = null;
      }
    });
    markersRef.current = [];

    const allPlaces: Array<{
      place: CarRepairPlace | ParkingPlace;
      type: 'car_repair' | 'parking';
    }> = [
      ...carRepairs.map((p) => ({ place: p, type: 'car_repair' as const })),
      ...parkings.map((p) => ({ place: p, type: 'parking' as const })),
    ];

    allPlaces.forEach(({ place, type }, index) => {
      if (!googleMapRef.current) {
        console.warn('Cannot add marker: map not available');
        return;
      }

      const markerIcon = type === 'car_repair' ? MARKER_ICONS.carRepair : MARKER_ICONS.parking;
      let marker: google.maps.Marker | google.maps.marker.AdvancedMarkerElement;

      if (mapId && window.google?.maps?.marker?.AdvancedMarkerElement) {
        // Use AdvancedMarkerElement if mapId is configured
        try {
          const markerImg = document.createElement('img');
          markerImg.src = markerIcon;
          markerImg.style.width = '40px';
          markerImg.style.height = '48px';
          markerImg.style.cursor = 'pointer';
          markerImg.onerror = () => {
            console.error('Failed to load marker icon:', markerIcon);
          };

          marker = new window.google.maps.marker.AdvancedMarkerElement({
            map: googleMapRef.current,
            position: { lat: place.lat, lng: place.lng },
            content: markerImg,
            title: place.name,
          });
          
          console.log(`AdvancedMarkerElement created for ${type} #${index}:`, place.name);
        } catch (error) {
          console.warn('AdvancedMarkerElement failed, using standard Marker:', error);
          // Fallback to standard Marker
          marker = new window.google.maps.Marker({
            map: googleMapRef.current,
            position: { lat: place.lat, lng: place.lng },
            title: place.name,
            icon: {
              url: markerIcon,
              scaledSize: new window.google.maps.Size(40, 48),
            },
          });
          console.log(`Standard Marker created for ${type} #${index}:`, place.name);
        }
      } else {
        // Use standard Marker (works without mapId)
        marker = new window.google.maps.Marker({
          map: googleMapRef.current,
          position: { lat: place.lat, lng: place.lng },
          title: place.name,
          icon: {
            url: markerIcon,
            scaledSize: new window.google.maps.Size(40, 48),
          },
        });
        console.log(`Standard Marker created for ${type} #${index}:`, place.name);
      }

      // Add click listener (works for both types)
      if (marker.addListener) {
        marker.addListener('click', () => {
          setSelectedPlaceId(place.id);
          setActiveTab(type);

          if (infoWindowRef.current && googleMapRef.current) {
            infoWindowRef.current.setContent(createInfoWindowContent(place, type));
            // For AdvancedMarkerElement, use anchor; for Marker, use position
            if (marker instanceof window.google.maps.Marker) {
              infoWindowRef.current.setPosition({ lat: place.lat, lng: place.lng });
              infoWindowRef.current.open(googleMapRef.current);
            } else {
              infoWindowRef.current.open({
                anchor: marker,
                map: googleMapRef.current,
              });
            }
          }
        });
      }

      markersRef.current.push(marker);
    });

    console.log('Markers updated:', {
      carRepairsCount: carRepairs.length,
      parkingsCount: parkings.length,
      totalMarkers: markersRef.current.length,
    });

    // Update map bounds to show all markers
    if (googleMapRef.current && allPlaces.length > 0) {
      // Clear active route if exists (it can interfere with bounds update)
      if (isRouteActive && directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        setIsRouteActive(false);
      }

      // Wait a bit for markers to be fully rendered
      const updateBounds = () => {
        if (!googleMapRef.current) return;

        const bounds = new window.google.maps.LatLngBounds();
        
        // Add user location to bounds
        bounds.extend(userLocation);
        
        // Add all places to bounds
        allPlaces.forEach(({ place }) => {
          bounds.extend({ lat: place.lat, lng: place.lng });
        });

        // Check if bounds are valid
        if (!bounds.isEmpty()) {
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          const latDiff = Math.abs(ne.lat() - sw.lat());
          const lngDiff = Math.abs(ne.lng() - sw.lng());
          
          console.log('Updating map bounds to show all markers', {
            placesCount: allPlaces.length,
            markersCount: markersRef.current.length,
            bounds: { latDiff, lngDiff },
          });
          
          try {
            // First, trigger resize to ensure map container is properly sized
            if (window.google?.maps?.event) {
              window.google.maps.event.trigger(googleMapRef.current, 'resize');
            }

            // Fit map to show all markers with padding (50px on all sides)
            googleMapRef.current.fitBounds(bounds, 50);

            // Force another update after fitBounds
            setTimeout(() => {
              if (googleMapRef.current) {
                // Re-trigger resize to ensure map updates
                if (window.google?.maps?.event) {
                  window.google.maps.event.trigger(googleMapRef.current, 'resize');
                }
                // Also ensure bounds are applied
                const currentBounds = googleMapRef.current.getBounds();
                if (currentBounds && !currentBounds.equals(bounds)) {
                  console.log('Bounds mismatch, reapplying...');
                  googleMapRef.current.fitBounds(bounds, 50);
                }
              }
            }, 100);
          } catch (error) {
            console.error('Error updating map bounds:', error);
            // Fallback: calculate center and zoom manually
            const center = bounds.getCenter();
            if (center) {
              googleMapRef.current.setCenter(center);
              // Calculate appropriate zoom based on bounds
              const latDiff = Math.abs(ne.lat() - sw.lat());
              const lngDiff = Math.abs(ne.lng() - sw.lng());
              const maxDiff = Math.max(latDiff, lngDiff);
              const zoom = maxDiff > 0.1 ? 11 : maxDiff > 0.05 ? 12 : maxDiff > 0.02 ? 13 : 14;
              googleMapRef.current.setZoom(zoom);
            }
          }
        }
      };

      // Update bounds after a short delay to ensure markers are rendered
      setTimeout(updateBounds, 300);
    } else if (googleMapRef.current && allPlaces.length === 0) {
      // If no places, center on user location
      console.log('No places found, centering on user location');
      googleMapRef.current.setCenter(userLocation);
      googleMapRef.current.setZoom(14);
    }
  }, [mapsLoaded, carRepairs, parkings, createInfoWindowContent, mapId, userLocation]);

  // Handle place selection from list
  const handlePlaceClick = useCallback(
    (place: CarRepairPlace | ParkingPlace, type: 'car_repair' | 'parking') => {
      setSelectedPlaceId(place.id);

      if (!googleMapRef.current) return;

      // Pan and zoom to the selected place
      googleMapRef.current.panTo({ lat: place.lat, lng: place.lng });
      googleMapRef.current.setZoom(16);

      // Find the corresponding marker
      const allPlaces: Array<{
        place: CarRepairPlace | ParkingPlace;
        type: 'car_repair' | 'parking';
      }> = [
        ...carRepairs.map((p) => ({ place: p, type: 'car_repair' as const })),
        ...parkings.map((p) => ({ place: p, type: 'parking' as const })),
      ];

      const placeIndex = allPlaces.findIndex((p) => p.place.id === place.id && p.type === type);
      const marker = placeIndex !== -1 ? markersRef.current[placeIndex] : null;

      // Open InfoWindow for the selected place
      if (marker && infoWindowRef.current && googleMapRef.current) {
        infoWindowRef.current.setContent(createInfoWindowContent(place, type));
        
        // For standard Marker, use position; for AdvancedMarkerElement, use anchor
        if (marker instanceof window.google.maps.Marker) {
          infoWindowRef.current.setPosition({ lat: place.lat, lng: place.lng });
          infoWindowRef.current.open(googleMapRef.current);
        } else {
          // AdvancedMarkerElement
          infoWindowRef.current.open({
            anchor: marker,
            map: googleMapRef.current,
          });
        }
      } else if (infoWindowRef.current && googleMapRef.current) {
        // Fallback: open InfoWindow even if marker not found
        infoWindowRef.current.setContent(createInfoWindowContent(place, type));
        infoWindowRef.current.setPosition({ lat: place.lat, lng: place.lng });
        infoWindowRef.current.open(googleMapRef.current);
      }
    },
    [carRepairs, parkings, createInfoWindowContent]
  );

  // Handle route building
  const handleRouteClick = useCallback(
    (place: CarRepairPlace | ParkingPlace) => {
      if (!directionsServiceRef.current || !directionsRendererRef.current || !googleMapRef.current) {
        // Fallback to external Google Maps if Directions API not available
        const url =
          place.mapsUri ||
          `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }

      setIsRouteActive(true);

      // Clear previous route
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current.setMap(googleMapRef.current);
      }

      // Build route from user location to selected place
      directionsServiceRef.current.route(
        {
          origin: userLocation,
          destination: { lat: place.lat, lng: place.lng },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK && result && directionsRendererRef.current) {
            directionsRendererRef.current.setDirections(result);
            // Fit map to show entire route
            if (googleMapRef.current) {
              const bounds = new window.google.maps.LatLngBounds();
              result.routes[0].legs.forEach((leg) => {
                bounds.extend(leg.start_location);
                bounds.extend(leg.end_location);
              });
              googleMapRef.current.fitBounds(bounds);
            }
          } else {
            console.error('Directions request failed:', status);
            setIsRouteActive(false);
            // Fallback to external Google Maps
            const url =
              place.mapsUri ||
              `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
            window.open(url, '_blank', 'noopener,noreferrer');
          }
        }
      );
    },
    [userLocation]
  );

  // Clear route function
  const clearRoute = useCallback(() => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      setIsRouteActive(false);
    }
  }, []);

  // Clear route when a new place is selected (but keep it if route is active)
  // Route will be cleared when user clicks on a different place

  // Show error state (but keep map container)
  if (error || mapsError) {
    return (
      <div className="flex h-full w-full flex-col">
        <div
          ref={setMapContainerRef}
          className="w-full rounded-lg border bg-gray-100 dark:bg-gray-800"
          style={{ 
            height: '300px', 
            minHeight: '300px',
            width: '100%',
            position: 'relative'
          }}
        >
          <ErrorDisplay message={error || mapsError || 'Unknown error'} />
        </div>
        <div className="mt-3 flex-1 sm:mt-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'car_repair' | 'parking')}>
            <TabsList className="w-full">
              <TabsTrigger value="car_repair" className="flex-1 gap-1.5 text-xs sm:gap-2 sm:text-sm">
                <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Car </span>Repair
              </TabsTrigger>
              <TabsTrigger value="parking" className="flex-1 gap-1.5 text-xs sm:gap-2 sm:text-sm">
                <Car className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Parking
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    );
  }

  // Show API key missing error (but keep map container)
  if (!apiKey) {
    return (
      <div className="flex h-full w-full flex-col">
        <div
          ref={setMapContainerRef}
          className="w-full rounded-lg border bg-gray-100 dark:bg-gray-800"
          style={{ 
            height: '300px', 
            minHeight: '300px',
            width: '100%',
            position: 'relative'
          }}
        >
          <ErrorDisplay message="Google Maps API key не настроен. Добавьте NEXT_PUBLIC_GOOGLE_MAPS_API_KEY в .env.local" />
        </div>
        <div className="mt-3 flex-1 sm:mt-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'car_repair' | 'parking')}>
            <TabsList className="w-full">
              <TabsTrigger value="car_repair" className="flex-1 gap-1.5 text-xs sm:gap-2 sm:text-sm">
                <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Car </span>Repair
              </TabsTrigger>
              <TabsTrigger value="parking" className="flex-1 gap-1.5 text-xs sm:gap-2 sm:text-sm">
                <Car className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Parking
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Map Container - always render so ref is available */}
      <div
        ref={setMapContainerRef}
        className="w-full rounded-lg border bg-gray-100 dark:bg-gray-800"
        style={{ 
          height: '300px', 
          minHeight: '300px',
          width: '100%',
          position: 'relative'
        }}
      >
        {!mapsLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-muted-foreground text-sm z-10">
            <div className="text-center">
              <div className="mb-2">Loading map...</div>
              {mapsError && (
                <div className="text-destructive text-xs">{mapsError}</div>
              )}
            </div>
          </div>
        )}
        {/* Loading overlay - show when data is loading but map is already rendered */}
        {isLoading && mapsLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm text-muted-foreground text-sm z-20 rounded-lg">
            <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
              <div className="mb-2 animate-spin h-6 w-6 border-2 border-[#21808D] border-t-transparent rounded-full mx-auto"></div>
              <div>Updating places...</div>
            </div>
          </div>
        )}
        {/* Route clear button */}
        {isRouteActive && (
          <Button
            onClick={clearRoute}
            variant="outline"
            size="sm"
            className="absolute top-2 right-2 z-10 bg-white dark:bg-gray-800 shadow-md"
          >
            Clear Route
          </Button>
        )}
      </div>

      {/* Places List */}
      <div className="mt-3 flex-1 sm:mt-4">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'car_repair' | 'parking')}
        >
          <TabsList className="w-full">
            <TabsTrigger value="car_repair" className="flex-1 gap-1.5 text-xs sm:gap-2 sm:text-sm">
              <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Car </span>Repair
              {carRepairs.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px] sm:ml-1 sm:h-5 sm:px-1.5 sm:text-xs">
                  {carRepairs.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="parking" className="flex-1 gap-1.5 text-xs sm:gap-2 sm:text-sm">
              <Car className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Parking
              {parkings.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px] sm:ml-1 sm:h-5 sm:px-1.5 sm:text-xs">
                  {parkings.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="car_repair" className="mt-2 sm:mt-3">
            <ScrollArea className="h-[calc(65vh-200px)] sm:h-[calc(60vh-180px)] md:h-[calc(55vh-160px)]">
              {carRepairs.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-sm sm:py-8">
                  No car repair shops found nearby
                </div>
              ) : (
                <div className="space-y-2 pr-2 sm:pr-3">
                  {carRepairs.map((place) => (
                    <PlaceListItem
                      key={place.id}
                      place={place}
                      type="car_repair"
                      isSelected={selectedPlaceId === place.id}
                      onClick={() => handlePlaceClick(place, 'car_repair')}
                      onRouteClick={() => handleRouteClick(place)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="parking" className="mt-2 sm:mt-3">
            <ScrollArea className="h-[calc(65vh-200px)] sm:h-[calc(60vh-180px)] md:h-[calc(55vh-160px)]">
              {parkings.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-sm sm:py-8">
                  No parking found nearby
                </div>
              ) : (
                <div className="space-y-2 pr-2 sm:pr-3">
                  {parkings.map((place) => (
                    <PlaceListItem
                      key={place.id}
                      place={place}
                      type="parking"
                      isSelected={selectedPlaceId === place.id}
                      onClick={() => handlePlaceClick(place, 'parking')}
                      onRouteClick={() => handleRouteClick(place)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

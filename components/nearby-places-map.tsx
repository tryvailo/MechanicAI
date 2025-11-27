'use client';

/// <reference types="google.maps" />

import { useCallback, useEffect, useRef, useState } from 'react';

// Suppress removeChild errors for prototype - Google Maps API sometimes conflicts with React DOM
if (typeof window !== 'undefined') {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function<T extends Node>(child: T): T {
    try {
      return originalRemoveChild.call(this, child) as T;
    } catch (error: any) {
      // Ignore removeChild errors - common with Google Maps API
      if (error?.name === 'NotFoundError' && error?.message?.includes('removeChild')) {
        return child;
      }
      throw error;
    }
  };
}
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

// Simple Google Maps Script Loader Hook
function useGoogleMapsScript(apiKey: string, mapId?: string) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already loaded
    if (window.google?.maps?.Map) {
      setIsLoaded(true);
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      // Wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.Map) {
          setIsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkLoaded);
        if (!window.google?.maps?.Map) {
          setLoadError('Google Maps API failed to load');
        }
      }, 5000);
      
      return () => clearInterval(checkLoaded);
    }

    // Don't load if API key is missing
    if (!apiKey || apiKey.trim() === '') {
      setLoadError('Google Maps API key is not configured');
      return;
    }

    // Create and load script
    const script = document.createElement('script');
    const libraries = mapId ? 'marker' : '';
    script.src = libraries
      ? `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libraries}`
      : `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // Simple check - wait a bit for API to be ready
      const checkReady = setInterval(() => {
        if (window.google?.maps?.Map) {
          setIsLoaded(true);
          clearInterval(checkReady);
        }
      }, 50);
      
      // Timeout after 3 seconds
      setTimeout(() => {
        clearInterval(checkReady);
        if (!window.google?.maps?.Map) {
          setLoadError('Google Maps API failed to initialize');
        }
      }, 3000);
    };

    script.onerror = () => {
      setLoadError('Failed to load Google Maps script');
    };

    document.head.appendChild(script);

    return () => {
      // Don't remove script - it may be used by other components
    };
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
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Array<google.maps.Marker | google.maps.marker.AdvancedMarkerElement>>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'car_repair' | 'parking'>('car_repair');
  const [isRouteActive, setIsRouteActive] = useState(false);

  // Safely get environment variables (works in both dev and production)
  const apiKey = typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '')
    : (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '');
  const mapId = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || '')
    : (process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || '');
  const { isLoaded: mapsLoaded, loadError: mapsError } = useGoogleMapsScript(apiKey, mapId);


  // Initialize map function
  const initializeMap = useCallback((container: HTMLDivElement) => {
    if (typeof window === 'undefined') return;
    if (googleMapRef.current || !window.google?.maps?.Map || !container) {
      return;
    }
    
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
    } catch (error: any) {
      // Try with minimal options if full initialization fails
      try {
        googleMapRef.current = new window.google.maps.Map(container, {
          center: userLocation,
          zoom: 14,
        });
      } catch (minimalError) {
        console.error('Failed to initialize Google Map:', minimalError);
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
      if (googleMapRef.current && typeof window !== 'undefined' && window.google?.maps?.event) {
        try {
          window.google.maps.event.trigger(googleMapRef.current, 'resize');
        } catch (error) {
          // Ignore errors if map is being unmounted
        }
      }
    }, 100);
  }, [userLocation]);

  // Use a simple ref instead of callback ref to avoid removeChild issues
  // React will handle the ref assignment automatically


  // Initialize map when script is loaded and container is ready
  useEffect(() => {
    if (!mapsLoaded || !mapContainerRef.current || googleMapRef.current) {
      return;
    }

    if (!window.google?.maps?.Map) {
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
      return;
    }

    let isMounted = true;
    const timeoutIds: NodeJS.Timeout[] = [];

    // Clear existing markers - wrap in try-catch to prevent removeChild errors
    try {
      markersRef.current.forEach((marker) => {
        try {
          if (marker instanceof window.google.maps.Marker) {
            marker.setMap(null);
          } else if ('map' in marker) {
            marker.map = null;
          }
        } catch (error) {
          // Ignore individual marker errors
        }
      });
      markersRef.current = [];
    } catch (error) {
      // Ignore errors - markers will be cleared when map is destroyed
      markersRef.current = [];
    }

    const allPlaces: Array<{
      place: CarRepairPlace | ParkingPlace;
      type: 'car_repair' | 'parking';
    }> = [
      ...carRepairs.map((p) => ({ place: p, type: 'car_repair' as const })),
      ...parkings.map((p) => ({ place: p, type: 'parking' as const })),
    ];

    allPlaces.forEach(({ place, type }, index) => {
      if (!googleMapRef.current || !isMounted) {
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
        } catch (error) {
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
      }

      // Add click listener (works for both types)
      if (marker.addListener) {
        marker.addListener('click', () => {
          if (!isMounted || !googleMapRef.current) return;
          
          setSelectedPlaceId(place.id);
          setActiveTab(type);

          if (infoWindowRef.current && googleMapRef.current) {
            try {
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
            } catch (error) {
              // Ignore errors
            }
          }
        });
      }

      markersRef.current.push(marker);
    });

    // Update map bounds to show all markers
    if (googleMapRef.current && allPlaces.length > 0 && isMounted) {
      // Clear active route if exists
      if (isRouteActive && directionsRendererRef.current) {
        try {
          directionsRendererRef.current.setMap(null);
          setIsRouteActive(false);
        } catch (error) {
          // Ignore errors
        }
      }

      // Simple update bounds function
      const updateBounds = () => {
        if (!isMounted || !googleMapRef.current) return;

        try {
          const bounds = new window.google.maps.LatLngBounds();
          
          // Add user location to bounds
          bounds.extend(userLocation);
          
          // Add all places to bounds
          allPlaces.forEach(({ place }) => {
            bounds.extend({ lat: place.lat, lng: place.lng });
          });

          // Fit map to show all markers
          if (!bounds.isEmpty() && googleMapRef.current) {
            googleMapRef.current.fitBounds(bounds, 50);
          }
        } catch (error) {
          // Fallback: center on user location
          if (googleMapRef.current && isMounted) {
            try {
              googleMapRef.current.setCenter(userLocation);
              googleMapRef.current.setZoom(14);
            } catch (fallbackError) {
              // Ignore fallback errors
            }
          }
        }
      };

      // Update bounds after a short delay
      const timeoutId = setTimeout(updateBounds, 300);
      timeoutIds.push(timeoutId);
    } else if (googleMapRef.current && allPlaces.length === 0 && isMounted) {
      // If no places, center on user location
      try {
        googleMapRef.current.setCenter(userLocation);
        googleMapRef.current.setZoom(14);
      } catch (error) {
        // Ignore errors
      }
    }

    // Cleanup
    return () => {
      isMounted = false;
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [mapsLoaded, carRepairs, parkings, createInfoWindowContent, mapId, userLocation, isRouteActive]);

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
            try {
              // Ensure result is a valid DirectionsResult object
              if (result && typeof result === 'object' && result.routes && Array.isArray(result.routes) && result.routes.length > 0) {
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
                throw new Error('Invalid directions result');
              }
            } catch (error) {
              console.error('Error setting directions:', error);
              setIsRouteActive(false);
              // Fallback to external Google Maps
              const url =
                place.mapsUri ||
                `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
              window.open(url, '_blank', 'noopener,noreferrer');
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

  // Always render the same container structure to avoid removeChild issues
  // Only change the content inside based on state
  return (
    <div className="flex h-full w-full flex-col">
      {/* Map Container - always render so ref is stable */}
      <div
        ref={mapContainerRef}
        className="w-full rounded-lg border bg-gray-100 dark:bg-gray-800"
        style={{ 
          height: '300px', 
          minHeight: '300px',
          width: '100%',
          position: 'relative'
        }}
      >
        {/* Show error if API key is missing */}
        {(!apiKey || apiKey.trim() === '') && (
          <ErrorDisplay message="Google Maps API key не настроен. Добавьте NEXT_PUBLIC_GOOGLE_MAPS_API_KEY в переменные окружения Vercel (для продакшена) или в .env.local (для разработки)" />
        )}
        
        {/* Show error if there's a maps error */}
        {(error || mapsError) && apiKey && (
          <ErrorDisplay message={error || mapsError || 'Unknown error'} />
        )}
        
        {/* Show loading state */}
        {!mapsLoaded && apiKey && !error && !mapsError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-muted-foreground text-sm z-10">
            <div className="text-center">
              <div className="mb-2">Loading map...</div>
            </div>
          </div>
        )}
        
        {/* Loading overlay - show when data is loading but map is already rendered */}
        {isLoading && mapsLoaded && apiKey && !error && !mapsError && (
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

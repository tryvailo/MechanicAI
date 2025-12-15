/**
 * Google Places API (New) Configuration
 * @module lib/config/places
 *
 * @see https://developers.google.com/maps/documentation/places/web-service/nearby-search
 */

// =============================================================================
// API Endpoints
// =============================================================================

/** Google Places API (New) base URL */
export const PLACES_API_BASE_URL = 'https://places.googleapis.com/v1';

/** Nearby Search endpoint */
export const PLACES_NEARBY_SEARCH_URL = `${PLACES_API_BASE_URL}/places:searchNearby`;

/** Place Details endpoint */
export const PLACES_DETAILS_URL = `${PLACES_API_BASE_URL}/places`;

// =============================================================================
// Search Configuration
// =============================================================================

/** Default search radius in meters */
export const DEFAULT_SEARCH_RADIUS_METERS = 5000;

/** Minimum search radius in meters */
export const MIN_SEARCH_RADIUS_METERS = 1000;

/** Maximum search radius in meters */
export const MAX_SEARCH_RADIUS_METERS = 15000;

/** Maximum results per category */
export const MAX_RESULTS_PER_CATEGORY = 10;

// =============================================================================
// Place Types
// =============================================================================

/** Supported place types for the app */
export const PLACE_TYPES = {
  CAR_REPAIR: 'car_repair',
  PARKING: 'parking',
} as const;

export type PlaceType = (typeof PLACE_TYPES)[keyof typeof PLACE_TYPES];

/** All supported place types as array */
export const SUPPORTED_PLACE_TYPES: PlaceType[] = [
  PLACE_TYPES.CAR_REPAIR,
  PLACE_TYPES.PARKING,
];

// =============================================================================
// Field Masks
// =============================================================================

/**
 * Fields to request from Places API.
 * Using minimal fields to reduce response size and API costs.
 */
export const PLACES_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.rating',
  'places.userRatingCount',
  'places.formattedAddress',
  'places.location',
  'places.googleMapsUri',
  'places.priceLevel',
  'places.websiteUri',
] as const;

export const PLACES_FIELD_MASK_STRING = PLACES_FIELD_MASK.join(',');

// =============================================================================
// Rank Preferences
// =============================================================================

export const RANK_PREFERENCE = {
  /** Best for car repair - shows highest rated first */
  POPULARITY: 'POPULARITY',
  /** Best for parking - shows closest first */
  DISTANCE: 'DISTANCE',
} as const;

export type RankPreference = (typeof RANK_PREFERENCE)[keyof typeof RANK_PREFERENCE];

/** Default rank preference per place type */
export const DEFAULT_RANK_BY_TYPE: Record<PlaceType, RankPreference> = {
  [PLACE_TYPES.CAR_REPAIR]: RANK_PREFERENCE.POPULARITY,
  [PLACE_TYPES.PARKING]: RANK_PREFERENCE.DISTANCE,
};

// =============================================================================
// API Types
// =============================================================================

/** Google Places API location coordinate */
export type GoogleLocation = {
  latitude: number;
  longitude: number;
};

/** Google Places API display name */
export type GoogleDisplayName = {
  text: string;
  languageCode: string;
};

/** Google Places API place object */
export type GooglePlace = {
  id?: string;
  displayName?: GoogleDisplayName;
  rating?: number;
  userRatingCount?: number;
  formattedAddress?: string;
  location?: GoogleLocation;
  googleMapsUri?: string;
  priceLevel?: GooglePriceLevel;
  websiteUri?: string;
};

/** Google Places API price level enum */
export type GooglePriceLevel =
  | 'PRICE_LEVEL_UNSPECIFIED'
  | 'PRICE_LEVEL_FREE'
  | 'PRICE_LEVEL_INEXPENSIVE'
  | 'PRICE_LEVEL_MODERATE'
  | 'PRICE_LEVEL_EXPENSIVE'
  | 'PRICE_LEVEL_VERY_EXPENSIVE';

/** Google Places API error response */
export type GooglePlacesError = {
  code: number;
  message: string;
  status: string;
};

/** Google Places API nearby search response */
export type GooglePlacesNearbyResponse = {
  places?: GooglePlace[];
  error?: GooglePlacesError;
};

// =============================================================================
// App-specific Types
// =============================================================================

/** Nearby places search request */
export type NearbyPlacesRequest = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  placeTypes: PlaceType[];
};

/** Car repair place (transformed from Google API) */
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

/** Parking place (transformed from Google API) */
export type ParkingPlace = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  mapsUri: string;
  priceLevel: string | null;
  distance: number;
};

/** Nearby places API response */
export type NearbyPlacesResponse = {
  carRepairs: CarRepairPlace[];
  parkings: ParkingPlace[];
};

// =============================================================================
// Environment & Validation
// =============================================================================

/**
 * Gets the Google Places API key from environment variables.
 * @returns API key or undefined if not set
 */
export function getPlacesApiKey(): string | undefined {
  return process.env.GOOGLE_PLACES_API_KEY;
}

/**
 * Gets the Google Maps JavaScript API key for client-side use.
 * @returns API key or undefined if not set
 */
export function getMapsApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
}

/**
 * Validates that the Places API key is configured.
 * @throws Error if API key is missing
 */
export function validatePlacesApiKey(): void {
  const apiKey = getPlacesApiKey();
  
  if (!apiKey) {
    throw new Error(
      'GOOGLE_PLACES_API_KEY is not configured. ' +
      'Please add it to your .env.local file.'
    );
  }

  if (apiKey.length < 20) {
    throw new Error(
      'GOOGLE_PLACES_API_KEY appears to be invalid. ' +
      'Please check your API key configuration.'
    );
  }
}

/**
 * Checks if Places API is properly configured.
 * @returns Object with configuration status
 */
export function checkPlacesConfig(): {
  isConfigured: boolean;
  hasServerKey: boolean;
  hasClientKey: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const serverKey = getPlacesApiKey();
  const clientKey = getMapsApiKey();

  if (!serverKey) {
    errors.push('Missing GOOGLE_PLACES_API_KEY (server-side)');
  }

  if (!clientKey) {
    errors.push('Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (client-side)');
  }

  return {
    isConfigured: errors.length === 0,
    hasServerKey: !!serverKey,
    hasClientKey: !!clientKey,
    errors,
  };
}

// =============================================================================
// Request Builders
// =============================================================================

/**
 * Builds headers for Google Places API request.
 * @param apiKey - Google API key
 * @returns Headers object
 */
export function buildPlacesHeaders(apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': PLACES_FIELD_MASK_STRING,
  };
}

/**
 * Builds request body for nearby search.
 * @param params - Search parameters
 * @returns Request body object
 */
export function buildNearbySearchBody(params: {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  placeType: PlaceType;
  maxResults?: number;
}): object {
  const { latitude, longitude, radiusMeters, placeType, maxResults } = params;

  return {
    includedTypes: [placeType],
    maxResultCount: maxResults ?? MAX_RESULTS_PER_CATEGORY,
    rankPreference: DEFAULT_RANK_BY_TYPE[placeType],
    locationRestriction: {
      circle: {
        center: { latitude, longitude },
        radius: radiusMeters,
      },
    },
  };
}

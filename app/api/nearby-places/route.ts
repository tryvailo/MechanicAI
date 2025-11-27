import { NextRequest, NextResponse } from 'next/server';
import { calculateDistance } from '@/lib/utils/distance';
import {
  PLACES_NEARBY_SEARCH_URL,
  PLACES_FIELD_MASK_STRING,
  MAX_RESULTS_PER_CATEGORY,
  SUPPORTED_PLACE_TYPES,
  DEFAULT_RANK_BY_TYPE,
  getPlacesApiKey,
  type PlaceType,
  type GooglePlace,
  type GooglePlacesNearbyResponse,
  type NearbyPlacesRequest,
  type NearbyPlacesResponse,
  type CarRepairPlace,
  type ParkingPlace,
} from '@/lib/config/places';

async function searchNearbyPlaces(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  placeType: PlaceType,
  apiKey: string
): Promise<GooglePlacesNearbyResponse> {
  const requestBody = {
    includedTypes: [placeType],
    maxResultCount: MAX_RESULTS_PER_CATEGORY,
    rankPreference: DEFAULT_RANK_BY_TYPE[placeType],
    locationRestriction: {
      circle: {
        center: { latitude, longitude },
        radius: radiusMeters,
      },
    },
  };

  const response = await fetch(PLACES_NEARBY_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': PLACES_FIELD_MASK_STRING,
    },
    body: JSON.stringify(requestBody),
  });

  return response.json() as Promise<GooglePlacesNearbyResponse>;
}

function transformToCarRepair(
  place: GooglePlace,
  userLat: number,
  userLng: number
): CarRepairPlace {
  const lat = place.location?.latitude ?? 0;
  const lng = place.location?.longitude ?? 0;

  return {
    id: place.id ?? '',
    name: place.displayName?.text ?? 'Unknown',
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? 0,
    address: place.formattedAddress ?? '',
    lat,
    lng,
    mapsUri: place.googleMapsUri ?? '',
    priceLevel: place.priceLevel ?? null,
    websiteUri: place.websiteUri ?? null,
    distance: calculateDistance(userLat, userLng, lat, lng),
  };
}

function transformToParking(
  place: GooglePlace,
  userLat: number,
  userLng: number
): ParkingPlace {
  const lat = place.location?.latitude ?? 0;
  const lng = place.location?.longitude ?? 0;

  return {
    id: place.id ?? '',
    name: place.displayName?.text ?? 'Unknown',
    address: place.formattedAddress ?? '',
    lat,
    lng,
    mapsUri: place.googleMapsUri ?? '',
    distance: calculateDistance(userLat, userLng, lat, lng),
  };
}

function validateRequest(body: unknown): body is NearbyPlacesRequest {
  if (!body || typeof body !== 'object') return false;

  const req = body as Record<string, unknown>;

  if (typeof req.latitude !== 'number' || typeof req.longitude !== 'number') {
    return false;
  }

  if (typeof req.radiusMeters !== 'number' || req.radiusMeters <= 0) {
    return false;
  }

  if (!Array.isArray(req.placeTypes) || req.placeTypes.length === 0) {
    return false;
  }

  return req.placeTypes.every((t) =>
    SUPPORTED_PLACE_TYPES.includes(t as PlaceType)
  );
}

export async function POST(request: NextRequest) {
  const apiKey = getPlacesApiKey();

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Places API key not configured' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!validateRequest(body)) {
    return NextResponse.json(
      {
        error:
          'Invalid request. Required: latitude (number), longitude (number), radiusMeters (number), placeTypes (array of "car_repair" | "parking")',
      },
      { status: 400 }
    );
  }

  const { latitude, longitude, radiusMeters, placeTypes } = body;

  const response: NearbyPlacesResponse = {
    carRepairs: [],
    parkings: [],
  };

  try {
    const searchPromises = placeTypes.map((placeType) =>
      searchNearbyPlaces(
        latitude,
        longitude,
        radiusMeters,
        placeType,
        apiKey
      ).then((result) => ({ type: placeType, result }))
    );

    const results = await Promise.all(searchPromises);

    for (const { type, result } of results) {
      if (result.error) {
        if (
          result.error.code === 403 ||
          result.error.status === 'PERMISSION_DENIED'
        ) {
          return NextResponse.json(
            { error: 'Invalid or unauthorized API key' },
            { status: 401 }
          );
        }
        console.error(`Google Places API error for ${type}:`, result.error);
        continue;
      }

      const places = result.places ?? [];

      if (type === 'car_repair') {
        response.carRepairs = places
          .map((p) => transformToCarRepair(p, latitude, longitude))
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
          .slice(0, MAX_RESULTS_PER_CATEGORY);
      } else if (type === 'parking') {
        response.parkings = places
          .map((p) => transformToParking(p, latitude, longitude))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, MAX_RESULTS_PER_CATEGORY);
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch nearby places:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nearby places from Google Places API' },
      { status: 503 }
    );
  }
}

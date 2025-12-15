import { NextRequest, NextResponse } from 'next/server';
import { getPlacesApiKey } from '@/lib/config/places';

const DIRECTIONS_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

export type DirectionsRequest = {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  travelMode?: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT';
};

export type DirectionsResponse = {
  routes: Array<{
    distanceMeters: number;
    duration: string;
    polyline: { encodedPolyline: string };
    legs: Array<{
      startLocation: { latLng: { latitude: number; longitude: number } };
      endLocation: { latLng: { latitude: number; longitude: number } };
      distanceMeters: number;
      duration: string;
    }>;
  }>;
  error?: { code: number; message: string; status: string };
};

function validateRequest(body: unknown): body is DirectionsRequest {
  if (!body || typeof body !== 'object') return false;
  const req = body as Record<string, unknown>;

  if (!req.origin || typeof req.origin !== 'object') return false;
  if (!req.destination || typeof req.destination !== 'object') return false;

  const origin = req.origin as Record<string, unknown>;
  const destination = req.destination as Record<string, unknown>;

  if (typeof origin.lat !== 'number' || typeof origin.lng !== 'number') return false;
  if (typeof destination.lat !== 'number' || typeof destination.lng !== 'number') return false;

  return true;
}

export async function POST(request: NextRequest) {
  const apiKey = getPlacesApiKey();

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google API key not configured' },
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
      { error: 'Invalid request. Required: origin {lat, lng}, destination {lat, lng}' },
      { status: 400 }
    );
  }

  const { origin, destination, travelMode = 'DRIVE' } = body;

  try {
    const requestBody = {
      origin: {
        location: {
          latLng: { latitude: origin.lat, longitude: origin.lng },
        },
      },
      destination: {
        location: {
          latLng: { latitude: destination.lat, longitude: destination.lng },
        },
      },
      travelMode,
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: false,
      languageCode: 'en',
      units: 'METRIC',
    };

    const response = await fetch(DIRECTIONS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.startLocation,routes.legs.endLocation,routes.legs.distanceMeters,routes.legs.duration',
      },
      body: JSON.stringify(requestBody),
    });

    const data: DirectionsResponse = await response.json();

    if (data.error) {
      console.error('Directions API error:', data.error);
      return NextResponse.json(
        { error: data.error.message || 'Failed to compute route' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch directions:', error);
    return NextResponse.json(
      { error: 'Failed to compute route' },
      { status: 503 }
    );
  }
}

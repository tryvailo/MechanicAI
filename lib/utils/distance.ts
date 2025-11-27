/**
 * Geographic distance calculation utilities using the Haversine formula.
 * @module lib/utils/distance
 */

/** Earth's radius in kilometers */
const EARTH_RADIUS_KM = 6371;

/**
 * Converts degrees to radians.
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculates the great-circle distance between two points on Earth
 * using the Haversine formula.
 *
 * @param lat1 - Latitude of the first point in decimal degrees
 * @param lng1 - Longitude of the first point in decimal degrees
 * @param lat2 - Latitude of the second point in decimal degrees
 * @param lng2 - Longitude of the second point in decimal degrees
 * @returns Distance in kilometers, rounded to 1 decimal place
 *
 * @example
 * ```ts
 * // Distance from Kyiv to Lviv
 * const distance = calculateDistance(50.4501, 30.5234, 49.8397, 24.0297);
 * console.log(distance); // ~468.9
 * ```
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 10) / 10;
}

/**
 * Formats a distance value with appropriate unit label.
 *
 * @param distanceKm - Distance in kilometers
 * @returns Formatted distance string with unit (e.g., "1.2 km")
 *
 * @example
 * ```ts
 * formatDistance(1.5);   // "1.5 km"
 * formatDistance(0.3);   // "300 m"
 * ```
 */
export function formatDistance(distanceKm: number): string {
  // Show meters for distances less than 1 km
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }

  const formatted = distanceKm.toFixed(1);
  return `${formatted} km`;
}

/**
 * Coordinate point type for distance calculations.
 */
export type Coordinates = {
  lat: number;
  lng: number;
};

/**
 * Calculates distance between two coordinate objects.
 *
 * @param from - Starting coordinates
 * @param to - Destination coordinates
 * @returns Distance in kilometers, rounded to 1 decimal place
 *
 * @example
 * ```ts
 * const from = { lat: 50.4501, lng: 30.5234 };
 * const to = { lat: 49.8397, lng: 24.0297 };
 * const distance = calculateDistanceBetween(from, to);
 * ```
 */
export function calculateDistanceBetween(
  from: Coordinates,
  to: Coordinates
): number {
  return calculateDistance(from.lat, from.lng, to.lat, to.lng);
}

export const EARTH_RADIUS_MILES = 3958.8;

/** Haversine distance between two lat/lng points in miles */
export function distanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.asin(Math.sqrt(a));
}

/** Format miles for display */
export function formatDistance(miles: number): string {
  if (miles < 1) return "< 1 mi";
  return `${Math.round(miles).toLocaleString()} mi`;
}

/**
 * Reverse geocode a lat/lng to a US state name using Mapbox.
 * Returns the state name (e.g. "Alaska") or null on failure.
 */
export async function reverseGeocodeState(
  lat: number,
  lng: number,
  token: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=region&country=us&access_token=${token}`
    );
    const data = await res.json();
    return (data.features?.[0]?.text as string) ?? null;
  } catch {
    return null;
  }
}

/**
 * For a point outside a state bounding box, returns the distance in miles
 * to the nearest point on the bbox edge. Used for state-type scoring.
 */
export function distanceToNearestBboxEdge(
  lat: number,
  lng: number,
  bbox: [number, number, number, number]
): number {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const clampedLng = Math.max(minLng, Math.min(maxLng, lng));
  const clampedLat = Math.max(minLat, Math.min(maxLat, lat));
  return distanceMiles(lat, lng, clampedLat, clampedLng);
}

/** Get midpoint between two coords (for arc rendering) */
export function midpoint(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): [number, number] {
  return [(lat1 + lat2) / 2, (lng1 + lng2) / 2];
}

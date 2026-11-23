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

/** Get midpoint between two coords (for arc rendering) */
export function midpoint(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): [number, number] {
  return [(lat1 + lat2) / 2, (lng1 + lng2) / 2];
}

import type { LatLng } from "@/types/models";

const EARTH_RADIUS = 6378137; // Earth radius in meters

/**
 * Calculates a new coordinate offset from a starting point by a given distance and bearing.
 * Bearing is in degrees (0 = North, 90 = East, 180 = South, 270 = West).
 */
export function offsetCoordinate(start: LatLng, distanceMeters: number, bearingDegrees: number): LatLng {
  const lat1 = (start.latitude * Math.PI) / 180;
  const lon1 = (start.longitude * Math.PI) / 180;
  const brng = (bearingDegrees * Math.PI) / 180;
  
  const dR = distanceMeters / EARTH_RADIUS;

  const lat2 = Math.asin(
    Math.max(-1, Math.min(1,
      Math.sin(lat1) * Math.cos(dR) +
        Math.cos(lat1) * Math.sin(dR) * Math.cos(brng)
    ))
  );
  
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(dR) * Math.cos(lat1),
      Math.cos(dR) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    latitude: (lat2 * 180) / Math.PI,
    longitude: ((lon2 * 180) / Math.PI + 540) % 360 - 180,
  };
}

/**
 * Generates an ordered list of 5 coordinates forming a diamond loop optimized for motorcycle round-trips.
 * Start -> Point 1 (left flank) -> Point 2 (furthest peak) -> Point 3 (right flank) -> End (Start)
 */
export function generateRoundTripWaypoints(
  start: LatLng,
  targetDistanceKm: number,
  direction: "N" | "E" | "S" | "W" | "ANY"
): LatLng[] {
  // Road coefficient: real country-road routes are about 3.0x longer than direct straight line loops.
  const targetDistanceMeters = targetDistanceKm * 1000;
  const radius = targetDistanceMeters / 3.0;

  let baseAngle = 0;
  switch (direction) {
    case "N":
      baseAngle = 0;
      break;
    case "E":
      baseAngle = 90;
      break;
    case "S":
      baseAngle = 180;
      break;
    case "W":
      baseAngle = 270;
      break;
    case "ANY":
      baseAngle = Math.random() * 360;
      break;
  }

  // Generate three intermediate points to construct a magnificent loop
  const p1 = offsetCoordinate(start, radius * 0.6, baseAngle - 40);
  const p2 = offsetCoordinate(start, radius * 0.95, baseAngle);
  const p3 = offsetCoordinate(start, radius * 0.6, baseAngle + 40);

  // Return the complete circle loop
  return [start, p1, p2, p3, start];
}

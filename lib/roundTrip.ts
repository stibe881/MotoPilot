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

function baseAngleFor(direction: "N" | "E" | "S" | "W" | "ANY"): number {
  switch (direction) {
    case "N":
      return 0;
    case "E":
      return 90;
    case "S":
      return 180;
    case "W":
      return 270;
    case "ANY":
      return Math.random() * 360;
  }
}

/**
 * Generates an ordered loop of waypoints for a motorcycle round-trip.
 *
 * To avoid an "out-and-back" route (riding a road and returning on the same
 * one), the points are placed around a CIRCLE whose edge touches the start.
 * Routing through them in angular order yields a convex circuit that departs
 * and returns on different roads.
 *
 * Layout: the circle center sits one radius away in the chosen direction, so
 * the start lies on the loop. We then walk evenly spaced points around the
 * circle (skipping the one nearest the start) and close back to the start.
 */
export function generateRoundTripWaypoints(
  start: LatLng,
  targetDistanceKm: number,
  direction: "N" | "E" | "S" | "W" | "ANY"
): LatLng[] {
  const targetDistanceMeters = targetDistanceKm * 1000;

  // Road factor: real roads wander ~1.5x longer than the geometric loop.
  const ROAD_FACTOR = 1.5;
  // Loop ≈ circle circumference (2*pi*r). Solve for r from the target.
  const radius = targetDistanceMeters / (2 * Math.PI * ROAD_FACTOR);

  const baseAngle = baseAngleFor(direction);
  const center = offsetCoordinate(start, radius, baseAngle);

  // Points around the circle. k=0 sits back at the start, so we skip it and
  // sweep the remaining ones to form the outbound→around→return circuit.
  const N = 6;
  const points: LatLng[] = [start];
  for (let k = 1; k < N; k++) {
    const angle = baseAngle + 180 + (360 / N) * k;
    points.push(offsetCoordinate(center, radius, angle));
  }
  points.push(start);
  return points;
}

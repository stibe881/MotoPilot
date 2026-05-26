import type {
  GeoJsonLineString,
  LatLng,
  RoutePreference,
} from "@/types/models";

// OpenRouteService directions + geocoding.
// Get a free key at https://openrouteservice.org and expose it as
// EXPO_PUBLIC_ORS_API_KEY.
const ORS_BASE = "https://api.openrouteservice.org";
const apiKey = process.env.EXPO_PUBLIC_ORS_API_KEY;

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSecs: number;
  /** [startIndex, endIndex] into `coordinates`. */
  wayPoints: [number, number];
}

export interface SpeedLimitRange {
  from: number; // start coordinate index (inclusive)
  to: number; // end coordinate index (inclusive)
  speed: number; // km/h
}

export interface ComputedRoute {
  coordinates: LatLng[];
  geojson: GeoJsonLineString;
  distanceMeters: number;
  durationSecs: number;
  steps: RouteStep[];
  speedLimits: SpeedLimitRange[];
}

// ORS has no native "curvy" engine (that's Calimoto's secret sauce). We
// approximate rider-preferred roads by routing "recommended" while avoiding
// motorways/ferries; swap in a dedicated curvy engine here later.
function orsParams(preference: RoutePreference): {
  preference: "fastest" | "shortest" | "recommended";
  options?: Record<string, unknown>;
} {
  switch (preference) {
    case "fastest":
      return { preference: "fastest" };
    case "shortest":
      return { preference: "shortest" };
    case "curvy":
      return { preference: "recommended", options: { avoid_features: ["highways"] } };
    case "scenic":
      return { preference: "recommended", options: { avoid_features: ["highways", "ferries"] } };
  }
}

function requireKey(): string {
  if (!apiKey) {
    throw new Error("Missing EXPO_PUBLIC_ORS_API_KEY for OpenRouteService.");
  }
  return apiKey;
}

interface OrsDirectionsResponse {
  features: {
    geometry: { type: "LineString"; coordinates: [number, number][] };
    properties: {
      summary: { distance: number; duration: number };
      segments: {
        steps: {
          instruction: string;
          distance: number;
          duration: number;
          way_points: [number, number];
        }[];
      }[];
      extras?: {
        // maxspeed.values: [startIdx, endIdx, speedKmh] (-1 = unknown).
        maxspeed?: { values: [number, number, number][] };
      };
    };
  }[];
}

/**
 * Compute a route through the given ordered points (start, optional vias, end).
 * Coordinates are LatLng; ORS expects [lon, lat] so we flip on the wire.
 */
export async function getRoute(
  points: LatLng[],
  preference: RoutePreference,
  language?: string
): Promise<ComputedRoute> {
  if (points.length < 2) {
    throw new Error("A route needs at least a start and a destination.");
  }
  const { preference: pref, options } = orsParams(preference);

  const res = await fetch(`${ORS_BASE}/v2/directions/driving-car/geojson`, {
    method: "POST",
    headers: {
      Authorization: requireKey(),
      "Content-Type": "application/json",
      Accept: "application/geo+json",
    },
    body: JSON.stringify({
      coordinates: points.map((p) => [p.longitude, p.latitude]),
      preference: pref,
      instructions: true,
      // Turn-by-turn instructions localized to the rider's app language.
      ...(language ? { language } : {}),
      radiuses: points.map(() => -1),
      ...(options ? { options } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`Routing failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as OrsDirectionsResponse;
  const feature = data.features?.[0];
  if (!feature) throw new Error("No route found.");

  const coordinates: LatLng[] = feature.geometry.coordinates.map(([lon, lat]) => ({
    latitude: lat,
    longitude: lon,
  }));

  const steps: RouteStep[] = feature.properties.segments.flatMap((seg) =>
    seg.steps.map((s) => ({
      instruction: s.instruction,
      distanceMeters: s.distance,
      durationSecs: s.duration,
      wayPoints: s.way_points,
    }))
  );

  const speedLimits: SpeedLimitRange[] = (feature.properties.extras?.maxspeed?.values ?? [])
    .filter(([, , speed]) => speed > 0)
    .map(([from, to, speed]) => ({ from, to, speed }));

  return {
    coordinates,
    geojson: feature.geometry,
    distanceMeters: feature.properties.summary.distance,
    durationSecs: feature.properties.summary.duration,
    steps,
    speedLimits,
  };
}

interface OrsGeocodeResponse {
  features: {
    geometry: { coordinates: [number, number] };
    properties: { label: string };
  }[];
}

export interface GeocodeResult extends LatLng {
  label: string;
}

/** Forward-geocode a free-text query (Pelias via ORS). */
export async function geocode(
  query: string,
  near?: LatLng,
  limit = 5
): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({
    api_key: requireKey(),
    text: query,
    size: String(limit),
  });
  if (near) {
    params.set("focus.point.lon", String(near.longitude));
    params.set("focus.point.lat", String(near.latitude));
  }

  const res = await fetch(`${ORS_BASE}/geocode/search?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Geocoding failed (${res.status})`);
  }
  const data = (await res.json()) as OrsGeocodeResponse;
  return data.features.map((f) => ({
    label: f.properties.label,
    latitude: f.geometry.coordinates[1],
    longitude: f.geometry.coordinates[0],
  }));
}

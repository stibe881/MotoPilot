import type { LatLng } from "@/types/models";

// Place search via Photon (Komoot) — an OpenStreetMap geocoder with far better
// POI / business coverage than ORS/Pelias, plus type-ahead and language support.
// Public endpoint is rate-limited; self-host (https://github.com/komoot/photon)
// for production. Routing still uses ORS.
const PHOTON_BASE = "https://photon.komoot.io/api/";

export interface PlaceResult {
  title: string; // POI / street name
  subtitle: string; // city, region, country
  label: string; // full single-line label
  latitude: number;
  longitude: number;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    district?: string;
    county?: string;
    state?: string;
    country?: string;
    osm_value?: string;
  };
}

function toResult(f: PhotonFeature): PlaceResult {
  const p = f.properties;
  const title = p.name || [p.street, p.housenumber].filter(Boolean).join(" ") || p.city || "—";
  const subtitle = [p.postcode, p.city || p.district || p.county || p.state, p.country]
    .filter(Boolean)
    .join(", ");
  const label = [title, subtitle].filter(Boolean).join(", ");
  return {
    title,
    subtitle,
    label,
    longitude: f.geometry.coordinates[0],
    latitude: f.geometry.coordinates[1],
  };
}

/**
 * Type-ahead place/POI search. `near` biases results to the rider's area;
 * `lang` (de/en/fr) localizes names. Returns [] for blank/too-short queries.
 */
export async function searchPlaces(
  query: string,
  near?: LatLng,
  lang = "en",
  limit = 8
): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({ q, limit: String(limit) });
  // Photon supports de/en/fr; fall back to default otherwise.
  if (["de", "en", "fr"].includes(lang)) params.set("lang", lang);
  if (near) {
    params.set("lat", String(near.latitude));
    params.set("lon", String(near.longitude));
  }

  const res = await fetch(`${PHOTON_BASE}?${params.toString()}`);
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const data = (await res.json()) as { features?: PhotonFeature[] };
  return (data.features ?? []).map(toResult);
}

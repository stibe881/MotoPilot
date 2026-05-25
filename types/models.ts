// App-level domain types mirroring the Supabase schema
// (supabase/migrations/20260525090000_initial_schema.sql).

export type DistanceUnit = "metric" | "imperial";
export type RoutePreference = "fastest" | "shortest" | "curvy" | "scenic";
export type ServiceProvider = "spotify" | "apple_music" | "komoot" | "strava";
export type MemberRole = "owner" | "admin" | "member";

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bike_make: string | null;
  bike_model: string | null;
  bike_year: number | null;
  units: DistanceUnit;
  created_at: string;
  updated_at: string;
}

export interface RiderGroup {
  id: string;
  owner_id: string;
  name: string;
  join_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RiderGroupMember {
  group_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
}

export interface SavedRoute {
  id: string;
  user_id: string;
  name: string;
  preference: RoutePreference;
  geojson: GeoJsonLineString;
  waypoints: Waypoint[] | null;
  distance_meters: number | null;
  duration_secs: number | null;
  is_favorite: boolean;
  shared_group_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectedService {
  id: string;
  user_id: string;
  provider: ServiceProvider;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  scopes: string[] | null;
  provider_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RiderLocation {
  group_id: string;
  user_id: string;
  // lat/lon are the source of truth; `position` is a generated geometry column.
  lat: number;
  lon: number;
  heading: number | null;
  speed_mps: number | null;
  battery_pct: number | null;
  recorded_at: string;
}

// --- Geo helpers -------------------------------------------------------------
export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface Waypoint extends LatLng {
  label?: string;
}

export interface GeoJsonPoint {
  type: "Point";
  coordinates: [number, number]; // [lon, lat]
}

export interface GeoJsonLineString {
  type: "LineString";
  coordinates: [number, number][]; // [[lon, lat], ...]
}

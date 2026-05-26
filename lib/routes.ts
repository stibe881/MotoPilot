import { haversineMeters } from "@/lib/geo";
import type { ComputedRoute } from "@/lib/routing";
import { supabase } from "@/lib/supabase";
import type { LatLng, RoutePreference, SavedRoute, Waypoint } from "@/types/models";

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Not signed in");
  return id;
}

export async function listSavedRoutes(): Promise<SavedRoute[]> {
  const { data, error } = await supabase
    .from("saved_routes")
    .select("*")
    .order("is_favorite", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SavedRoute[];
}

export async function saveRoute(
  name: string,
  route: ComputedRoute,
  preference: RoutePreference,
  destination?: Waypoint | null
): Promise<SavedRoute> {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("saved_routes")
    .insert({
      user_id,
      name,
      preference,
      geojson: route.geojson, // trigger derives the geometry column
      distance_meters: route.distanceMeters,
      duration_secs: route.durationSecs,
      waypoints: destination ? [destination] : null,
      source: "planned",
    })
    .select()
    .single();
  if (error) throw error;
  return data as SavedRoute;
}

export async function deleteSavedRoute(id: string): Promise<void> {
  const { error } = await supabase.from("saved_routes").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Persist the actually-ridden breadcrumb trail as a saved route. Returns null
 * for trails too short to form a line.
 */
export async function saveDrivenRoute(
  name: string,
  path: LatLng[],
  preference: RoutePreference = "fastest"
): Promise<SavedRoute | null> {
  if (path.length < 2) return null;
  const user_id = await requireUserId();

  let distance = 0;
  for (let i = 0; i < path.length - 1; i++) distance += haversineMeters(path[i], path[i + 1]);

  const geojson = {
    type: "LineString" as const,
    coordinates: path.map((p) => [p.longitude, p.latitude] as [number, number]),
  };

  const { data, error } = await supabase
    .from("saved_routes")
    .insert({
      user_id,
      name,
      preference,
      geojson, // trigger derives the geometry column
      distance_meters: distance,
      source: "ridden",
    })
    .select()
    .single();
  if (error) throw error;
  return data as SavedRoute;
}

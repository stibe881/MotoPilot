import { useEffect, useState } from "react";
import * as Location from "expo-location";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getGroupMembers } from "@/lib/groups";
import { supabase } from "@/lib/supabase";
import { useIntercomStore } from "@/store/useIntercomStore";
import { useRideStore } from "@/store/useRideStore";

const PUBLISH_DISTANCE_M = 25;

type LocationRow = {
  group_id: string;
  user_id: string;
  lat: number;
  lon: number;
  heading: number | null;
  battery_pct: number | null;
};

/**
 * Joins a live group ride: streams every member's position into the ride store
 * (for map markers) via Supabase realtime, and publishes our own GPS while
 * `active` is true. Pass `null`/`active=false` to leave.
 */
export function useGroupRide(groupId: string | null, active: boolean) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId || !active) return;

    let channel: RealtimeChannel | null = null;
    let watch: Location.LocationSubscription | null = null;
    let cancelled = false;
    let selfId: string | null = null;
    const names = new Map<string, string>();

    const { upsertRider, removeRider, clearRiders } = useRideStore.getState();

    const nameFor = (userId: string) =>
      userId === selfId ? "You" : names.get(userId) ?? "Rider";

    const ingest = (row: LocationRow) => {
      upsertRider({
        userId: row.user_id,
        displayName: nameFor(row.user_id),
        position: { latitude: row.lat, longitude: row.lon },
        heading: row.heading,
        batteryPct: row.battery_pct,
        isSelf: row.user_id === selfId,
      });
    };

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      selfId = userData.user?.id ?? null;
      if (cancelled) return;

      // Resolve display names once.
      try {
        const members = await getGroupMembers(groupId);
        members.forEach((m) =>
          names.set(m.user_id, m.profile?.display_name ?? m.profile?.username ?? "Rider")
        );
      } catch {
        /* names are best-effort */
      }

      // Seed current positions.
      const { data: seed } = await supabase
        .from("rider_locations")
        .select("group_id, user_id, lat, lon, heading, battery_pct")
        .eq("group_id", groupId);
      if (cancelled) return;
      (seed as LocationRow[] | null)?.forEach(ingest);

      // Live updates.
      channel = supabase
        .channel(`group:${groupId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rider_locations", filter: `group_id=eq.${groupId}` },
          (payload) => {
            if (payload.eventType === "DELETE") {
              const old = payload.old as { user_id?: string };
              if (old.user_id) removeRider(old.user_id);
            } else {
              ingest(payload.new as LocationRow);
            }
          }
        )
        .subscribe();

      // Publish own location.
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;
      watch = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: PUBLISH_DISTANCE_M },
        async (pos) => {
          if (!selfId) return;
          const battery = useIntercomStore.getState().batteryPct;
          const { error: upErr } = await supabase.from("rider_locations").upsert({
            group_id: groupId,
            user_id: selfId,
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            heading: pos.coords.heading ?? null,
            speed_mps: pos.coords.speed ?? null,
            battery_pct: battery,
            recorded_at: new Date().toISOString(),
          });
          if (upErr) setError(upErr.message);
        }
      );
    })().catch((e) => setError(e instanceof Error ? e.message : "Group ride failed"));

    return () => {
      cancelled = true;
      watch?.remove();
      if (channel) supabase.removeChannel(channel);
      clearRiders();
      // Remove our stale pin for the others.
      if (selfId) {
        supabase
          .from("rider_locations")
          .delete()
          .eq("group_id", groupId)
          .eq("user_id", selfId)
          .then(() => undefined);
      }
    };
  }, [groupId, active]);

  return { error };
}

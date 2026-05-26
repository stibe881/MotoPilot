import { create } from "zustand";
import { getRoute, type ComputedRoute } from "@/lib/routing";
import { generateRoundTripWaypoints } from "@/lib/roundTrip";
import i18n from "@/lib/i18n";
import type { LatLng, RoutePreference, SavedRoute, Waypoint } from "@/types/models";

export interface LiveRider {
  userId: string;
  displayName: string;
  position: LatLng;
  heading: number | null;
  batteryPct: number | null;
  isSelf: boolean;
}

function lang(): string {
  return i18n.language || "en";
}

interface RideState {
  preference: RoutePreference;

  // Ordered points the route threads through (start, vias, end). These are the
  // draggable pins shown during preview. For a round-trip the first and last
  // entries are both the start.
  waypoints: Waypoint[];
  destination: Waypoint | null;
  route: ComputedRoute | null;

  // Lifecycle: idle -> preview (editable, not yet started) -> navigating.
  isPreviewing: boolean;
  isNavigating: boolean;
  isRoundTrip: boolean;

  stepIndex: number;
  routing: boolean;
  routeError: string | null;

  voiceEnabled: boolean;
  setVoiceEnabled: (v: boolean) => void;

  // Latest GPS fix while navigating — drives the chase camera.
  navPosition: { latitude: number; longitude: number; heading: number } | null;
  setNavPosition: (p: { latitude: number; longitude: number; heading: number }) => void;

  // Live distance (m) to the next maneuver point, for the turn banner.
  distanceToManeuver: number | null;
  setDistanceToManeuver: (m: number | null) => void;

  liveRiders: Record<string, LiveRider>;

  trackedPath: LatLng[];
  showTrackedPath: boolean;
  setShowTrackedPath: (show: boolean) => void;

  setPreference: (p: RoutePreference) => void;

  // Build a route and enter PREVIEW (does not start navigation).
  planTo: (from: LatLng, destination: Waypoint) => Promise<void>;
  planRoundTrip: (
    from: LatLng,
    distanceKm: number,
    direction: "N" | "E" | "S" | "W" | "ANY"
  ) => Promise<void>;
  // Move a pin and recompute, staying in preview.
  updateWaypoint: (index: number, point: LatLng) => Promise<void>;
  // Insert an intermediate stop (before the final point) and recompute.
  addWaypoint: (point: LatLng) => Promise<void>;
  // Remove an intermediate stop (start/end are protected) and recompute.
  removeWaypoint: (index: number) => Promise<void>;
  // Leave preview and begin turn-by-turn.
  startNavigation: () => void;

  recalculate: (from: LatLng) => Promise<void>;
  loadSavedRoute: (saved: SavedRoute) => void;
  setStepIndex: (i: number) => void;
  stopNavigation: () => void;

  upsertRider: (rider: LiveRider) => void;
  removeRider: (userId: string) => void;
  setRiders: (riders: LiveRider[]) => void;
  clearRiders: () => void;
}

const RESET = {
  waypoints: [] as Waypoint[],
  destination: null as Waypoint | null,
  route: null as ComputedRoute | null,
  isPreviewing: false,
  isNavigating: false,
  isRoundTrip: false,
  stepIndex: 0,
  routing: false,
  routeError: null as string | null,
  trackedPath: [] as LatLng[],
  navPosition: null as { latitude: number; longitude: number; heading: number } | null,
  distanceToManeuver: null as number | null,
};

export const useRideStore = create<RideState>((set, get) => ({
  preference: "curvy",
  ...RESET,
  voiceEnabled: true,
  setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
  setNavPosition: (navPosition) => set({ navPosition }),
  setDistanceToManeuver: (distanceToManeuver) => set({ distanceToManeuver }),
  liveRiders: {},
  showTrackedPath: true,
  setShowTrackedPath: (showTrackedPath) => set({ showTrackedPath }),

  setPreference: (preference) => set({ preference }),

  planTo: async (from, destination) => {
    const waypoints: Waypoint[] = [{ latitude: from.latitude, longitude: from.longitude }, destination];
    set({ ...RESET, routing: true, destination, waypoints });
    try {
      const route = await getRoute(waypoints, get().preference, lang());
      set({ route, isPreviewing: true, routing: false });
    } catch (e) {
      set({ routing: false, routeError: e instanceof Error ? e.message : "Could not compute route" });
      throw e;
    }
  },

  planRoundTrip: async (from, distanceKm, direction) => {
    const waypoints = generateRoundTripWaypoints(from, distanceKm, direction).map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
    }));
    set({ ...RESET, routing: true, isRoundTrip: true, waypoints });
    try {
      const route = await getRoute(waypoints, get().preference, lang());
      set({
        route,
        isPreviewing: true,
        isRoundTrip: true,
        routing: false,
        destination: {
          latitude: from.latitude,
          longitude: from.longitude,
          label: `Rundtour · ${distanceKm} km`,
        },
      });
    } catch (e) {
      set({ routing: false, routeError: e instanceof Error ? e.message : "Could not compute round trip" });
      throw e;
    }
  },

  updateWaypoint: async (index, point) => {
    const { waypoints, isRoundTrip } = get();
    if (index < 0 || index >= waypoints.length) return;
    const next = waypoints.slice();
    next[index] = { ...next[index], latitude: point.latitude, longitude: point.longitude };
    // For a round-trip the first and last pins are the same start location.
    if (isRoundTrip && index === 0) next[next.length - 1] = next[0];
    set({ waypoints: next, routing: true, routeError: null });
    try {
      const route = await getRoute(next, get().preference, lang());
      set({ route, routing: false });
    } catch (e) {
      set({ routing: false, routeError: e instanceof Error ? e.message : "Could not recompute route" });
    }
  },

  addWaypoint: async (point) => {
    const { waypoints } = get();
    if (waypoints.length < 2) return;
    const next = waypoints.slice();
    // Insert just before the final point (destination, or closing start).
    next.splice(next.length - 1, 0, { latitude: point.latitude, longitude: point.longitude });
    set({ waypoints: next, routing: true, routeError: null });
    try {
      const route = await getRoute(next, get().preference, lang());
      set({ route, routing: false });
    } catch (e) {
      set({ routing: false, routeError: e instanceof Error ? e.message : "Could not recompute route" });
    }
  },

  removeWaypoint: async (index) => {
    const { waypoints } = get();
    // Protect the start (0) and the final endpoint.
    if (index <= 0 || index >= waypoints.length - 1) return;
    const next = waypoints.slice();
    next.splice(index, 1);
    if (next.length < 2) return;
    set({ waypoints: next, routing: true, routeError: null });
    try {
      const route = await getRoute(next, get().preference, lang());
      set({ route, routing: false });
    } catch (e) {
      set({ routing: false, routeError: e instanceof Error ? e.message : "Could not recompute route" });
    }
  },

  startNavigation: () => {
    if (!get().route) return;
    set({ isNavigating: true, isPreviewing: false, stepIndex: 0, trackedPath: [] });
  },

  recalculate: async (from) => {
    const { destination, preference } = get();
    if (!destination) return;
    set({ routing: true, routeError: null });
    try {
      const route = await getRoute([from, destination], preference, lang());
      set({ route, stepIndex: 0, routing: false });
    } catch (e) {
      set({ routing: false, routeError: e instanceof Error ? e.message : "Could not recompute route" });
    }
  },

  loadSavedRoute: (saved) => {
    const coordinates = saved.geojson.coordinates.map(([lon, lat]) => ({
      latitude: lat,
      longitude: lon,
    }));
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    const dest = saved.waypoints?.[saved.waypoints.length - 1] ?? (last ? { ...last, label: saved.name } : null);
    set({
      ...RESET,
      preference: saved.preference,
      destination: dest,
      waypoints: first && dest ? [first, dest] : [],
      route: {
        coordinates,
        geojson: saved.geojson,
        distanceMeters: saved.distance_meters ?? 0,
        durationSecs: saved.duration_secs ?? 0,
        steps: [],
      },
      isPreviewing: true,
    });
  },

  setStepIndex: (stepIndex) => set({ stepIndex }),

  stopNavigation: () => set({ ...RESET }),

  upsertRider: (rider) => set((s) => ({ liveRiders: { ...s.liveRiders, [rider.userId]: rider } })),

  removeRider: (userId) =>
    set((s) => {
      const next = { ...s.liveRiders };
      delete next[userId];
      return { liveRiders: next };
    }),

  setRiders: (riders) => set({ liveRiders: Object.fromEntries(riders.map((r) => [r.userId, r])) }),

  clearRiders: () => set({ liveRiders: {} }),
}));

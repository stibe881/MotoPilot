import { create } from "zustand";
import { getRoute, type ComputedRoute } from "@/lib/routing";
import type { LatLng, RoutePreference, SavedRoute, Waypoint } from "@/types/models";
import { generateRoundTripWaypoints } from "@/lib/roundTrip";

export interface LiveRider {
  userId: string;
  displayName: string;
  position: LatLng;
  heading: number | null;
  batteryPct: number | null;
  isSelf: boolean;
}

interface RideState {
  preference: RoutePreference;
  destination: Waypoint | null;
  route: ComputedRoute | null;
  isNavigating: boolean;
  stepIndex: number;
  routing: boolean;
  routeError: string | null;

  // Live group riders, keyed by userId, for map markers.
  liveRiders: Record<string, LiveRider>;

  // Driven trail (breadcrumb path) tracking
  trackedPath: LatLng[];
  showTrackedPath: boolean;
  setShowTrackedPath: (show: boolean) => void;

  setPreference: (p: RoutePreference) => void;
  navigateTo: (from: LatLng, destination: Waypoint) => Promise<void>;
  navigateToRoundTrip: (from: LatLng, distanceKm: number, direction: "N" | "E" | "S" | "W" | "ANY") => Promise<void>;
  recalculate: (from: LatLng) => Promise<void>;
  loadSavedRoute: (saved: SavedRoute) => void;
  setStepIndex: (i: number) => void;
  stopNavigation: () => void;

  upsertRider: (rider: LiveRider) => void;
  removeRider: (userId: string) => void;
  setRiders: (riders: LiveRider[]) => void;
  clearRiders: () => void;
}

export const useRideStore = create<RideState>((set, get) => ({
  preference: "curvy",
  destination: null,
  route: null,
  isNavigating: false,
  stepIndex: 0,
  routing: false,
  routeError: null,
  liveRiders: {},
  trackedPath: [],
  showTrackedPath: true,
  setShowTrackedPath: (showTrackedPath) => set({ showTrackedPath }),

  setPreference: (preference) => set({ preference }),

  navigateTo: async (from, destination) => {
    set({ routing: true, routeError: null, destination, trackedPath: [] });
    try {
      const route = await getRoute([from, destination], get().preference);
      set({ route, isNavigating: true, stepIndex: 0, routing: false });
    } catch (e) {
      set({
        routing: false,
        routeError: e instanceof Error ? e.message : "Could not compute route",
      });
      throw e;
    }
  },

  navigateToRoundTrip: async (from, distanceKm, direction) => {
    set({ routing: true, routeError: null, trackedPath: [] });
    try {
      const waypoints = generateRoundTripWaypoints(from, distanceKm, direction);
      const route = await getRoute(waypoints, get().preference);
      set({
        route,
        isNavigating: true,
        stepIndex: 0,
        routing: false,
        destination: {
          latitude: from.latitude,
          longitude: from.longitude,
          label: `Rundtour (${distanceKm} km, Richtung ${direction})`,
        },
      });
    } catch (e) {
      set({
        routing: false,
        routeError: e instanceof Error ? e.message : "Could not compute round trip",
      });
      throw e;
    }
  },

  recalculate: async (from) => {
    const { destination, preference } = get();
    if (!destination) return;
    set({ routing: true, routeError: null });
    try {
      const route = await getRoute([from, destination], preference);
      set({ route, stepIndex: 0, routing: false });
    } catch (e) {
      set({
        routing: false,
        routeError: e instanceof Error ? e.message : "Could not recompute route",
      });
    }
  },

  loadSavedRoute: (saved) => {
    const coordinates = saved.geojson.coordinates.map(([lon, lat]) => ({
      latitude: lat,
      longitude: lon,
    }));
    const last = coordinates[coordinates.length - 1];
    const dest = saved.waypoints?.[saved.waypoints.length - 1];
    set({
      preference: saved.preference,
      destination: dest ?? (last ? { ...last, label: saved.name } : null),
      route: {
        coordinates,
        geojson: saved.geojson,
        distanceMeters: saved.distance_meters ?? 0,
        durationSecs: saved.duration_secs ?? 0,
        steps: [], // saved routes don't retain per-step instructions
      },
      isNavigating: true,
      stepIndex: 0,
      routing: false,
      routeError: null,
      trackedPath: [],
    });
  },

  setStepIndex: (stepIndex) => set({ stepIndex }),

  stopNavigation: () =>
    set({ isNavigating: false, route: null, destination: null, stepIndex: 0, routeError: null, trackedPath: [] }),

  upsertRider: (rider) =>
    set((s) => ({ liveRiders: { ...s.liveRiders, [rider.userId]: rider } })),

  removeRider: (userId) =>
    set((s) => {
      const next = { ...s.liveRiders };
      delete next[userId];
      return { liveRiders: next };
    }),

  setRiders: (riders) =>
    set({ liveRiders: Object.fromEntries(riders.map((r) => [r.userId, r])) }),

  clearRiders: () => set({ liveRiders: {} }),
}));

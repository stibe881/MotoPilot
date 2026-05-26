import { useEffect, useRef } from "react";
import * as Location from "expo-location";
import { distanceToPath, haversineMeters } from "@/lib/geo";
import { useRideStore } from "@/store/useRideStore";

const STEP_REACHED_M = 30; // advance to next step within this radius of its end
const OFF_ROUTE_M = 80; // recompute if we stray this far from the line
const RECALC_COOLDOWN_MS = 15_000;

/**
 * Drives turn-by-turn while a route is active: watches GPS, advances the
 * current step as the rider passes each maneuver, and recomputes the route if
 * they leave it. Mount once on the navigation screen.
 */
export function useNavigationTracker() {
  const lastRecalc = useRef(0);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || cancelled) return;

        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 10 },
          (pos) => {
            const { route, isNavigating, stepIndex, setStepIndex, recalculate, isRoundTrip } =
              useRideStore.getState();
            if (!isNavigating || !route || !route.coordinates || route.coordinates.length < 2) return;

            const here = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };

            // Record coordinates ridden actually for the breadcrumb trail (always saved in background)
            const { trackedPath } = useRideStore.getState();
            const lastPoint = trackedPath[trackedPath.length - 1];
            if (!lastPoint || haversineMeters(lastPoint, here) > 5) {
              useRideStore.setState({ trackedPath: [...trackedPath, here] });
            }

            // Off-route → recompute (rate-limited).
            // For planned scenic round-trips, do not automatically recalculate
            // to avoid destroying the planned scenic loop shape.
            const offBy = distanceToPath(here, route.coordinates);
            if (!isRoundTrip && offBy > OFF_ROUTE_M && Date.now() - lastRecalc.current > RECALC_COOLDOWN_MS) {
              lastRecalc.current = Date.now();
              recalculate(here);
              return;
            }

            // Advance the step once we reach its end waypoint.
            const step = route.steps[stepIndex];
            const endIdx = step?.wayPoints?.[1];
            const endCoord = endIdx != null && route.coordinates[endIdx] ? route.coordinates[endIdx] : undefined;
            if (
              endCoord &&
              typeof endCoord.latitude === "number" && !isNaN(endCoord.latitude) &&
              typeof endCoord.longitude === "number" && !isNaN(endCoord.longitude) &&
              stepIndex < route.steps.length - 1 &&
              haversineMeters(here, endCoord) < STEP_REACHED_M
            ) {
              setStepIndex(stepIndex + 1);
            }
          }
        );
      } catch (err) {
        console.warn("Failed to initialize navigation tracking location updates:", err);
      }
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);
}

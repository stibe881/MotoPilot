import { useEffect, useRef } from "react";
import * as Location from "expo-location";
import { distanceToPath, haversineMeters } from "@/lib/geo";
import { useRideStore } from "@/store/useRideStore";

const STEP_REACHED_M = 30; // advance to next step within this radius of its end
const OFF_ROUTE_M = 80; // recompute if we stray this far from the line
const RECALC_COOLDOWN_MS = 15_000;
const ARRIVE_M = 35; // auto-complete navigation within this radius of the end

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
          { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 1000 },
          (pos) => {
            const {
              route,
              isNavigating,
              stepIndex,
              setStepIndex,
              recalculate,
              isRoundTrip,
              setNavPosition,
              setDistanceToManeuver,
              setRemaining,
              completeNavigation,
            } = useRideStore.getState();
            if (!isNavigating || !route || !route.coordinates || route.coordinates.length < 2) return;

            const here = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };

            // Feed the chase camera (heading-up follow).
            setNavPosition({
              latitude: here.latitude,
              longitude: here.longitude,
              heading: pos.coords.heading != null && pos.coords.heading >= 0 ? pos.coords.heading : 0,
            });

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

            // Distance to the next maneuver (end of the current step) drives the
            // live "in X m, turn …" banner; advance the step once we reach it.
            const step = route.steps[stepIndex];
            const endIdx = step?.wayPoints?.[1];
            const endCoord = endIdx != null && route.coordinates[endIdx] ? route.coordinates[endIdx] : undefined;
            if (
              endCoord &&
              typeof endCoord.latitude === "number" && !isNaN(endCoord.latitude) &&
              typeof endCoord.longitude === "number" && !isNaN(endCoord.longitude)
            ) {
              const toManeuver = haversineMeters(here, endCoord);
              setDistanceToManeuver(toManeuver);
              if (stepIndex < route.steps.length - 1 && toManeuver < STEP_REACHED_M) {
                setStepIndex(stepIndex + 1);
              }
            }

            // Remaining distance/time to the destination: snap to the nearest
            // point on the route, then sum the rest of the polyline.
            const coords = route.coordinates;
            let nearestIdx = 0;
            let nearestDist = Infinity;
            for (let i = 0; i < coords.length; i++) {
              const d = haversineMeters(here, coords[i]);
              if (d < nearestDist) {
                nearestDist = d;
                nearestIdx = i;
              }
            }
            let remaining = nearestDist;
            for (let i = nearestIdx; i < coords.length - 1; i++) {
              remaining += haversineMeters(coords[i], coords[i + 1]);
            }
            const frac = route.distanceMeters > 0 ? remaining / route.distanceMeters : 0;
            setRemaining(remaining, route.durationSecs * Math.min(1, frac));

            // Arrival: near the END of the polyline (high index guards against a
            // round-trip's start==end coordinate triggering at departure).
            if (
              nearestIdx >= coords.length - 2 &&
              trackedPath.length > 3 &&
              haversineMeters(here, coords[coords.length - 1]) < ARRIVE_M
            ) {
              completeNavigation();
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

import type { DistanceUnit } from "@/types/models";

export function formatDistance(meters: number | undefined | null, units: DistanceUnit = "metric"): string {
  if (meters == null || isNaN(meters)) return "0 m";
  if (units === "imperial") {
    const miles = meters / 1609.344;
    if (miles < 0.2) return `${Math.round(meters * 3.28084)} ft`;
    return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
  }
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export function formatDuration(seconds: number | undefined | null): string {
  if (seconds == null || isNaN(seconds)) return "0 min";
  const total = Math.round(seconds / 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export function formatEta(seconds: number | undefined | null): string {
  if (seconds == null || isNaN(seconds)) return "--:--";
  const arrival = new Date(Date.now() + seconds * 1000);
  return arrival.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

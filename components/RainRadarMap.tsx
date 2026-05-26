import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  UrlTile,
  type Region,
} from "react-native-maps";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, layout } from "@/theme";
import { BigButton } from "@/components/ui/BigButton";
import { NavBanner } from "@/components/NavBanner";
import { useRideStore } from "@/store/useRideStore";

// --- RainViewer public API ---------------------------------------------------
// https://www.rainviewer.com/api/weather-maps-api.html
// weather-maps.json returns a CDN host plus arrays of radar frames. Each frame's
// `path` already contains its capture timestamp, so the tile template is:
//   {host}{path}/{tileSize}/{z}/{x}/{y}/{colorScheme}/{options}.png
const RAINVIEWER_INDEX = "https://api.rainviewer.com/public/weather-maps.json";
const TILE_SIZE = 256;
const COLOR_SCHEME = 4; // "Universal Blue" — readable over a dark basemap
const OPTIONS = "1_1"; // smooth + show snow
const ANIMATION_INTERVAL_MS = 700;

type RainFrame = { time: number; path: string };

type RainViewerIndex = {
  host: string;
  radar?: { past?: RainFrame[]; nowcast?: RainFrame[] };
};

const DEFAULT_REGION: Region = {
  // Alps — a sensible curvy-road default until we have a GPS fix.
  latitude: 46.8,
  longitude: 8.2,
  latitudeDelta: 2.5,
  longitudeDelta: 2.5,
};

function buildTileTemplate(host: string, frame: RainFrame): string {
  return `${host}${frame.path}/${TILE_SIZE}/{z}/{x}/{y}/${COLOR_SCHEME}/${OPTIONS}.png`;
}

function getRouteRegion(coordinates: { latitude: number; longitude: number }[]): Region | null {
  if (coordinates.length === 0) return null;
  let minLat = coordinates[0].latitude;
  let maxLat = coordinates[0].latitude;
  let minLng = coordinates[0].longitude;
  let maxLng = coordinates[0].longitude;

  for (const c of coordinates) {
    if (c.latitude < minLat) minLat = c.latitude;
    if (c.latitude > maxLat) maxLat = c.latitude;
    if (c.longitude < minLng) minLng = c.longitude;
    if (c.longitude > maxLng) maxLng = c.longitude;
  }

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  
  const latDelta = Math.max(0.015, (maxLat - minLat) * 1.4);
  const lngDelta = Math.max(0.015, (maxLng - minLng) * 1.4);

  return {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

export function RainRadarMap() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);

  const [host, setHost] = useState<string | null>(null);
  const [frames, setFrames] = useState<RainFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [radarVisible, setRadarVisible] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [loadingRadar, setLoadingRadar] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [mapType, setMapType] = useState<"standard" | "hybrid">("standard");

  const route = useRideStore((s) => s.route);
  const destination = useRideStore((s) => s.destination);
  const isNavigating = useRideStore((s) => s.isNavigating);
  const isPreviewing = useRideStore((s) => s.isPreviewing);
  const isRoundTrip = useRideStore((s) => s.isRoundTrip);
  const waypoints = useRideStore((s) => s.waypoints);
  const updateWaypoint = useRideStore((s) => s.updateWaypoint);
  const liveRiders = useRideStore((s) => s.liveRiders);
  const trackedPath = useRideStore((s) => s.trackedPath);
  const showTrackedPath = useRideStore((s) => s.showTrackedPath);

  // Fit the map to the route once it's computed and map layout is ready.
  useEffect(() => {
    if (mapReady && route && route.coordinates.length > 1) {
      const routeRegion = getRouteRegion(route.coordinates);
      if (routeRegion) {
        const timer = setTimeout(() => {
          mapRef.current?.animateToRegion(routeRegion, 500);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [route, mapReady]);

  // Center on the rider once location permission is granted.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted" || cancelled) return;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        const next: Region = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.4,
          longitudeDelta: 0.4,
        };
        mapRef.current?.animateToRegion(next, 500);
      } catch (err) {
        console.warn("Failed to retrieve initial location:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadRadar = useCallback(async () => {
    try {
      setLoadingRadar(true);
      const res = await fetch(RAINVIEWER_INDEX);
      const data = (await res.json()) as RainViewerIndex;
      const past = data.radar?.past ?? [];
      const nowcast = data.radar?.nowcast ?? [];
      const combined = [...past, ...nowcast];
      setHost(data.host);
      setFrames(combined);
      setFrameIndex(Math.max(0, past.length - 1)); // start at "now"
    } catch (err) {
      console.warn("RainViewer fetch failed", err);
      setFrames([]);
    } finally {
      setLoadingRadar(false);
    }
  }, []);

  useEffect(() => {
    loadRadar();
    // RainViewer publishes a new frame ~every 10 min; refresh the index.
    const refresh = setInterval(loadRadar, 5 * 60 * 1000);
    return () => clearInterval(refresh);
  }, [loadRadar]);

  // Step through the radar frames for the rain-motion animation.
  useEffect(() => {
    if (!playing || !radarVisible || frames.length < 2) return;
    const id = setInterval(() => {
      setFrameIndex((i) => (i + 1) % frames.length);
    }, ANIMATION_INTERVAL_MS);
    return () => clearInterval(id);
  }, [playing, radarVisible, frames.length]);

  const activeFrame = frames[frameIndex];
  const tileTemplate =
    host && activeFrame ? buildTileTemplate(host, activeFrame) : null;

  const frameLabel = activeFrame
    ? new Date(activeFrame.time * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT} // Apple Maps (MapKit) on iOS
        userInterfaceStyle="dark"
        mapType={mapType}
        initialRegion={DEFAULT_REGION}
        onMapReady={() => setMapReady(true)}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        rotateEnabled
        pitchEnabled
      >
        {mapReady && radarVisible && tileTemplate ? (
          <UrlTile
            key="weather-radar-overlay"
            urlTemplate={tileTemplate}
            tileSize={TILE_SIZE}
            zIndex={1}
            opacity={0.7}
            shouldReplaceMapContent={false}
            minimumZ={2}
            maximumZ={7} // RainViewer caps public tiles at zoom 7; levels 8+ are automatically scaled natively!
          />
        ) : null}

        {route && route.coordinates.length >= 2 ? (
          <Polyline
            coordinates={route.coordinates}
            strokeColor={colors.info}
            strokeWidth={7}
            zIndex={2}
          />
        ) : null}

        {showTrackedPath && trackedPath.length >= 2 ? (
          <Polyline
            coordinates={trackedPath}
            strokeColor={colors.accent}
            strokeWidth={8}
            zIndex={3}
          />
        ) : null}

        {/* Editable waypoint pins during preview — drag to reshape the route. */}
        {isPreviewing &&
          waypoints.map((wp, i) => {
            const isStart = i === 0;
            const isDuplicateEnd = isRoundTrip && i === waypoints.length - 1;
            if (isDuplicateEnd) return null;
            if (typeof wp.latitude !== "number" || isNaN(wp.latitude)) return null;
            return (
              <Marker
                key={`wp-${i}`}
                identifier={`wp-${i}`}
                coordinate={{ latitude: wp.latitude, longitude: wp.longitude }}
                draggable={!isStart}
                onDragEnd={(e) => updateWaypoint(i, e.nativeEvent.coordinate)}
                pinColor={isStart ? colors.success : colors.accent}
                title={isStart ? t("plan.startPin") : t("plan.stopPin", { n: i })}
                zIndex={5}
              />
            );
          })}

        {/* Destination marker only while navigating (preview uses draggable pins). */}
        {destination && !isPreviewing &&
         typeof destination.latitude === "number" && !isNaN(destination.latitude) &&
         typeof destination.longitude === "number" && !isNaN(destination.longitude) ? (
          <Marker
            coordinate={destination}
            title={destination.label ?? t("radar.destination")}
            pinColor={colors.accent}
          />
        ) : null}

        {Object.values(liveRiders)
          .filter((r) => !r.isSelf && 
                         r.position && 
                         typeof r.position.latitude === "number" && !isNaN(r.position.latitude) &&
                         typeof r.position.longitude === "number" && !isNaN(r.position.longitude))
          .map((rider) => (
            <Marker
              key={rider.userId}
              coordinate={rider.position}
              title={rider.displayName}
              description={
                rider.batteryPct != null ? t("radar.headset", { pct: rider.batteryPct }) : undefined
              }
              pinColor={colors.success}
              rotation={rider.heading ?? 0}
              flat
            />
          ))}
      </MapView>

      <NavBanner />

      {/* Timestamp pill — hidden while the turn-by-turn banner is up. */}
      {!isNavigating ? (
      <View
        style={[styles.timestampPill, { top: insets.top + layout.spacing.sm }]}
        pointerEvents="none"
      >
        {loadingRadar ? (
          <ActivityIndicator size="small" color={colors.textPrimary} />
        ) : (
          <>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: radarVisible ? colors.info : colors.textDisabled },
              ]}
            />
            <Text style={styles.timestampText}>{t("radar.label", { time: frameLabel })}</Text>
          </>
        )}
      </View>
      ) : null}

      {/* Radar controls — bottom-right, glove-sized */}
      <View style={styles.controls}>
        <BigButton
          iconOnly
          icon={radarVisible ? "rainy" : "rainy-outline"}
          variant={radarVisible ? "primary" : "neutral"}
          onPress={() => setRadarVisible((v) => !v)}
        />
        <BigButton
          iconOnly
          icon={playing ? "pause" : "play"}
          variant="neutral"
          disabled={!radarVisible || frames.length < 2}
          onPress={() => setPlaying((p) => !p)}
        />
        <BigButton
          iconOnly
          icon={mapType === "hybrid" ? "earth" : "earth-outline"}
          variant={mapType === "hybrid" ? "primary" : "neutral"}
          onPress={() => setMapType((m) => (m === "standard" ? "hybrid" : "standard"))}
        />
        <BigButton
          iconOnly
          icon="locate"
          variant="neutral"
          onPress={async () => {
            try {
              const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              mapRef.current?.animateToRegion({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }, 500);
            } catch (err) {
              console.warn("Locate centering failed:", err);
            }
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  timestampPill: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: layout.spacing.sm,
    backgroundColor: colors.mapDim,
    paddingHorizontal: layout.spacing.md,
    paddingVertical: layout.spacing.sm,
    borderRadius: layout.radius.pill,
    minHeight: 36,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timestampText: {
    color: colors.textPrimary,
    fontSize: layout.font.label,
    fontWeight: layout.fontWeight.bold,
  },
  controls: {
    position: "absolute",
    right: layout.spacing.md,
    bottom: layout.spacing.lg,
    gap: layout.spacing.md,
  },
});

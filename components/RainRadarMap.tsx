import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import MapView, {
  PROVIDER_DEFAULT,
  UrlTile,
  type Region,
} from "react-native-maps";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, layout } from "@/theme";
import { BigButton } from "@/components/ui/BigButton";

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

export function RainRadarMap() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);

  const [host, setHost] = useState<string | null>(null);
  const [frames, setFrames] = useState<RainFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [radarVisible, setRadarVisible] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [loadingRadar, setLoadingRadar] = useState(true);

  // Center on the rider once location permission is granted.
  useEffect(() => {
    let cancelled = false;
    (async () => {
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
      setRegion(next);
      mapRef.current?.animateToRegion(next, 600);
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
        initialRegion={DEFAULT_REGION}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        rotateEnabled
        pitchEnabled
      >
        {radarVisible && tileTemplate ? (
          <UrlTile
            key={tileTemplate}
            urlTemplate={tileTemplate}
            tileSize={TILE_SIZE}
            zIndex={1}
            opacity={0.7}
            shouldReplaceMapContent={false}
            maximumZ={12}
          />
        ) : null}
      </MapView>

      {/* Timestamp pill */}
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
            <Text style={styles.timestampText}>Radar {frameLabel}</Text>
          </>
        )}
      </View>

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
          icon="locate"
          variant="neutral"
          onPress={() => mapRef.current?.animateToRegion(region, 500)}
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

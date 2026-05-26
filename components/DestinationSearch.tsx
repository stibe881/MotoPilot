import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { searchPlaces, type PlaceResult } from "@/lib/geocoding";
import { deleteSavedRoute, listSavedRoutes } from "@/lib/routes";
import { formatDistance } from "@/lib/format";
import { useProfileStore } from "@/store/useProfileStore";
import { useRideStore } from "@/store/useRideStore";
import { colors, layout } from "@/theme";
import type { RoutePreference, SavedRoute } from "@/types/models";

const PREFERENCES: { key: RoutePreference; label: string }[] = [
  { key: "curvy", label: "Curvy" },
  { key: "fastest", label: "Fastest" },
  { key: "shortest", label: "Shortest" },
  { key: "scenic", label: "Scenic" },
];

async function currentLatLng() {
  const last = await Location.getLastKnownPositionAsync();
  const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
}

interface CustomSliderProps {
  value: number;
  onValueChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

function CustomSlider({
  value,
  onValueChange,
  min = 30,
  max = 300,
  step = 10,
}: CustomSliderProps) {
  const [sliderWidth, setSliderWidth] = useState(0);

  const handleTouch = (evt: any) => {
    if (sliderWidth <= 0) return;
    const locationX = evt.nativeEvent.locationX;
    const pct = Math.max(0, Math.min(1, locationX / sliderWidth));
    const rawVal = min + pct * (max - min);
    const steppedVal = Math.round(rawVal / step) * step;
    onValueChange(Math.max(min, Math.min(max, steppedVal)));
  };

  const pct = (value - min) / (max - min);

  return (
    <View style={sliderStyles.container}>
      <View
        style={sliderStyles.trackContainer}
        onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
      >
        <View style={sliderStyles.trackBackground} pointerEvents="none" />
        <View style={[sliderStyles.trackFill, { width: `${pct * 100}%` }]} pointerEvents="none" />
        <View style={[sliderStyles.thumb, { left: `${pct * 100}%` }]} pointerEvents="none" />
      </View>
      <View style={sliderStyles.labels}>
        <Text style={sliderStyles.labelText}>{min} km</Text>
        <Text style={sliderStyles.valueText}>{value} km</Text>
        <Text style={sliderStyles.labelText}>{max} km</Text>
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: "100%",
  },
  trackContainer: {
    height: 40,
    justifyContent: "center",
    position: "relative",
    width: "100%",
  },
  trackBackground: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
    height: 6,
    width: "100%",
  },
  trackFill: {
    backgroundColor: colors.accent,
    borderRadius: 3,
    height: 6,
    position: "absolute",
  },
  thumb: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.accent,
    borderRadius: 12,
    borderWidth: 3,
    height: 24,
    marginLeft: -12,
    position: "absolute",
    width: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 5,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  labelText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  valueText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "bold",
  },
});

export function DestinationSearch() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const isNavigating = useRideStore((s) => s.isNavigating);
  const isPreviewing = useRideStore((s) => s.isPreviewing);
  const arrived = useRideStore((s) => s.arrived);
  const routing = useRideStore((s) => s.routing);
  const preference = useRideStore((s) => s.preference);
  const setPreference = useRideStore((s) => s.setPreference);
  const planTo = useRideStore((s) => s.planTo);
  const planRoundTrip = useRideStore((s) => s.planRoundTrip);
  const loadSavedRoute = useRideStore((s) => s.loadSavedRoute);
  const units = useProfileStore((s) => s.profile?.units ?? "metric");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [saved, setSaved] = useState<SavedRoute[]>([]);
  const [showRoundTrip, setShowRoundTrip] = useState(false);
  const [targetDistance, setTargetDistance] = useState(100);
  const [direction, setDirection] = useState<"N" | "E" | "S" | "W" | "ANY">("ANY");
  const [generatingLoop, setGeneratingLoop] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Type-ahead place/POI suggestions (debounced) while typing in "Where to?".
  useEffect(() => {
    if (showSaved || showRoundTrip) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const near = await currentLatLng().catch(() => undefined);
        setResults(await searchPlaces(q, near, i18n.language));
      } catch (e) {
        setError(e instanceof Error ? e.message : t("search.searchError"));
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, showSaved, showRoundTrip, i18n.language, t]);

  if (isNavigating || isPreviewing || arrived) return null;

  const toggleSaved = async () => {
    const next = !showSaved;
    setShowSaved(next);
    if (next) {
      setError(null);
      try {
        setSaved(await listSavedRoutes());
      } catch (e) {
        setError(e instanceof Error ? e.message : t("search.loadError"));
      }
    }
  };

  const removeSaved = async (id: string) => {
    setSaved((prev) => prev.filter((r) => r.id !== id));
    try {
      await deleteSavedRoute(id);
    } catch {
      /* refetch on next open */
    }
  };

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const near = await currentLatLng().catch(() => undefined);
      setResults(await searchPlaces(query.trim(), near, i18n.language));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("search.searchError"));
    } finally {
      setSearching(false);
    }
  };

  const choose = async (r: PlaceResult) => {
    setResults([]);
    setQuery(r.label);
    try {
      const from = await currentLatLng();
      await planTo(from, { latitude: r.latitude, longitude: r.longitude, label: r.title });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("search.navError"));
    }
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + layout.spacing.sm }]}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder={t("search.placeholder")}
          placeholderTextColor={colors.textDisabled}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={runSearch}
        />
        <Pressable style={styles.searchButton} onPress={runSearch} accessibilityRole="button">
          {searching ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.searchButtonText}>{t("search.go")}</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.iconButton, showSaved && styles.iconButtonActive]}
          onPress={toggleSaved}
          accessibilityRole="button"
          accessibilityLabel={t("search.savedRoutes")}
        >
          <Ionicons
            name="bookmark"
            size={26}
            color={showSaved ? colors.onAccent : colors.textPrimary}
          />
        </Pressable>
      </View>

      {/* Roundtrip Loop Toggle Button */}
      <Pressable
        style={[styles.roundTripToggleBtn, showRoundTrip && styles.roundTripToggleBtnActive]}
        onPress={() => {
          setShowRoundTrip(!showRoundTrip);
          setShowSaved(false);
          setResults([]);
        }}
      >
        <Ionicons
          name={showRoundTrip ? "compass" : "compass-outline"}
          size={18}
          color={showRoundTrip ? colors.onAccent : colors.textPrimary}
        />
        <Text style={[styles.roundTripToggleText, showRoundTrip && styles.roundTripToggleTextActive]}>
          Rundtour-Planer
        </Text>
      </Pressable>

      {/* Roundtrip Planner Panel */}
      {showRoundTrip ? (
        <View style={styles.roundTripPanel}>
          <Text style={styles.sectionTitle}>1. Ziel-Distanz</Text>
          <CustomSlider
            value={targetDistance}
            onValueChange={setTargetDistance}
            min={30}
            max={300}
            step={10}
          />

          <Text style={styles.sectionTitle}>2. Himmelsrichtung</Text>
          <View style={styles.roundTripRow}>
            {([
              { key: "N", label: "Nord", icon: "arrow-up-outline" },
              { key: "E", label: "Ost", icon: "arrow-forward-outline" },
              { key: "S", label: "Süd", icon: "arrow-down-outline" },
              { key: "W", label: "West", icon: "arrow-back-outline" },
              { key: "ANY", label: "Zufall", icon: "shuffle-outline" },
            ] as const).map((dir) => (
              <Pressable
                key={dir.key}
                style={[styles.smallChip, direction === dir.key && styles.smallChipActive]}
                onPress={() => setDirection(dir.key)}
              >
                <View style={styles.directionChipContent}>
                  <Ionicons
                    name={dir.icon}
                    size={13}
                    color={direction === dir.key ? colors.accent : colors.textSecondary}
                  />
                  <Text style={[styles.smallChipText, direction === dir.key && styles.smallChipTextActive]}>
                    {dir.label}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>3. Routen-Fahrstil (Präferenz)</Text>
          <View style={styles.roundTripRow}>
            {PREFERENCES.map((p) => {
              const active = p.key === preference;
              return (
                <Pressable
                  key={p.key}
                  onPress={() => setPreference(p.key)}
                  style={[styles.smallChip, active && styles.smallChipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.smallChipText, active && styles.smallChipTextActive]}>
                    {t(`search.${p.key}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={styles.generateBtn}
            onPress={async () => {
              setGeneratingLoop(true);
              setError(null);
              try {
                const from = await currentLatLng();
                await planRoundTrip(from, targetDistance, direction);
                setShowRoundTrip(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Rundtour konnte nicht generiert werden.");
              } finally {
                setGeneratingLoop(false);
              }
            }}
            disabled={generatingLoop}
          >
            {generatingLoop ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color={colors.onAccent} />
                <Text style={styles.generateBtnText}>Epische Rundtour generieren</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {showSaved ? (
        <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
          {saved.length === 0 ? (
            <Text style={styles.emptySaved}>{t("search.noSaved")}</Text>
          ) : (
            saved.map((r) => (
              <View key={r.id} style={styles.savedRow}>
                <Pressable
                  style={styles.savedMain}
                  onPress={() => {
                    setShowSaved(false);
                    loadSavedRoute(r);
                  }}
                >
                  <Text style={styles.resultText} numberOfLines={1}>
                    {r.name}
                  </Text>
                  <View style={styles.savedMetaRow}>
                    <Ionicons
                      name={r.source === "ridden" ? "speedometer" : "map"}
                      size={13}
                      color={r.source === "ridden" ? colors.success : colors.info}
                    />
                    <Text style={styles.savedMeta}>
                      {t(r.source === "ridden" ? "search.ridden" : "search.planned")}
                      {r.distance_meters != null
                        ? ` · ${formatDistance(r.distance_meters, units)}`
                        : ""}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => removeSaved(r.id)}
                  accessibilityLabel={t("search.delete", { name: r.name })}
                >
                  <Ionicons name="trash" size={22} color={colors.danger} />
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      ) : null}

      {!showSaved && results.length > 0 ? (
        <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
          {results.map((r, i) => (
            <Pressable key={`${r.label}-${i}`} style={styles.resultItem} onPress={() => choose(r)}>
              <Text style={styles.resultText} numberOfLines={1}>
                {r.title}
              </Text>
              {r.subtitle ? (
                <Text style={styles.savedMeta} numberOfLines={1}>
                  {r.subtitle}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: layout.spacing.md,
    gap: layout.spacing.sm,
    zIndex: 10,
  },
  searchRow: {
    flexDirection: "row",
    gap: layout.spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: layout.font.label,
    fontWeight: layout.fontWeight.bold,
    paddingLeft: layout.spacing.xs,
  },
  input: {
    flex: 1,
    minHeight: layout.touchTargetMin,
    backgroundColor: "rgba(12, 14, 20, 0.9)", // deep translucent slate
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    paddingHorizontal: layout.spacing.md,
    color: colors.textPrimary,
    fontSize: layout.font.body,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  searchButton: {
    minWidth: layout.touchTargetMin,
    minHeight: layout.touchTargetMin,
    paddingHorizontal: layout.spacing.md,
    borderRadius: layout.radius.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  searchButtonText: {
    color: colors.onAccent,
    fontSize: layout.font.body,
    fontWeight: layout.fontWeight.heavy,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  iconButton: {
    width: layout.touchTargetMin,
    minHeight: layout.touchTargetMin,
    borderRadius: layout.radius.md,
    backgroundColor: "rgba(12, 14, 20, 0.9)",
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  iconButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
  },
  emptySaved: {
    color: colors.textSecondary,
    fontSize: layout.font.body,
    padding: layout.spacing.md,
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  savedMain: {
    flex: 1,
    minHeight: layout.touchTargetMin,
    paddingHorizontal: layout.spacing.md,
    justifyContent: "center",
    gap: 2,
  },
  savedMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.spacing.xs,
  },
  savedMeta: {
    color: colors.textSecondary,
    fontSize: layout.font.label,
  },
  deleteButton: {
    width: layout.touchTargetMin,
    minHeight: layout.touchTargetMin,
    alignItems: "center",
    justifyContent: "center",
  },
  prefRow: {
    flexDirection: "row",
    gap: layout.spacing.sm,
  },
  chip: {
    flex: 1,
    minHeight: 44,
    borderRadius: layout.radius.sm, // sporty chamfered styling
    backgroundColor: "rgba(12, 14, 20, 0.8)",
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: "rgba(255, 94, 0, 0.12)", // neon orange backing tint
    borderColor: colors.accent, // neon orange border
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: layout.font.label - 1,
    fontWeight: layout.fontWeight.heavy,
    textTransform: "uppercase", // DRIVE MODE feeling
    letterSpacing: 0.5,
  },
  chipTextActive: {
    color: colors.accent,
  },
  results: {
    maxHeight: 240,
    backgroundColor: "rgba(12, 14, 20, 0.95)",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  resultItem: {
    minHeight: layout.touchTargetMin,
    paddingHorizontal: layout.spacing.md,
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  resultText: {
    color: colors.textPrimary,
    fontSize: layout.font.body,
  },
  roundTripToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: layout.spacing.sm,
    backgroundColor: "rgba(12, 14, 20, 0.8)",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: layout.radius.sm,
    paddingVertical: 10,
    marginTop: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  roundTripToggleBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  roundTripToggleText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "bold",
  },
  roundTripToggleTextActive: {
    color: colors.onAccent,
  },
  roundTripPanel: {
    backgroundColor: "rgba(12, 14, 20, 0.95)",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    padding: layout.spacing.md,
    gap: layout.spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  roundTripRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: layout.spacing.xs,
    marginBottom: layout.spacing.xs,
  },
  smallChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: layout.radius.sm,
    backgroundColor: "rgba(30, 34, 46, 0.8)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  smallChipActive: {
    backgroundColor: "rgba(255, 94, 0, 0.15)",
    borderColor: colors.accent,
  },
  smallChipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "bold",
  },
  smallChipTextActive: {
    color: colors.accent,
  },
  directionChipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: layout.spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: layout.radius.sm,
    paddingVertical: 12,
    marginTop: layout.spacing.xs,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  generateBtnText: {
    color: colors.onAccent,
    fontSize: 13,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

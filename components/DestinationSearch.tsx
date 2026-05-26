import { useState } from "react";
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
import { geocode, type GeocodeResult } from "@/lib/routing";
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

export function DestinationSearch() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isNavigating = useRideStore((s) => s.isNavigating);
  const routing = useRideStore((s) => s.routing);
  const preference = useRideStore((s) => s.preference);
  const setPreference = useRideStore((s) => s.setPreference);
  const navigateTo = useRideStore((s) => s.navigateTo);
  const loadSavedRoute = useRideStore((s) => s.loadSavedRoute);
  const units = useProfileStore((s) => s.profile?.units ?? "metric");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [saved, setSaved] = useState<SavedRoute[]>([]);

  if (isNavigating || routing) return null;

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
      setResults(await geocode(query.trim(), near));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("search.searchError"));
    } finally {
      setSearching(false);
    }
  };

  const choose = async (r: GeocodeResult) => {
    setResults([]);
    setQuery(r.label);
    try {
      const from = await currentLatLng();
      await navigateTo(from, { latitude: r.latitude, longitude: r.longitude, label: r.label });
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

      <View style={styles.prefRow}>
        {PREFERENCES.map((p) => {
          const active = p.key === preference;
          return (
            <Pressable
              key={p.key}
              onPress={() => setPreference(p.key)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(`search.${p.key}`)}</Text>
            </Pressable>
          );
        })}
      </View>

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
                  {r.distance_meters != null ? (
                    <Text style={styles.savedMeta}>
                      {formatDistance(r.distance_meters, units)} · {r.preference}
                    </Text>
                  ) : null}
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
              <Text style={styles.resultText} numberOfLines={2}>
                {r.label}
              </Text>
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
});

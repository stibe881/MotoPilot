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
  },
  searchRow: {
    flexDirection: "row",
    gap: layout.spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: layout.font.label,
    fontWeight: layout.fontWeight.bold,
  },
  input: {
    flex: 1,
    minHeight: layout.touchTargetMin,
    backgroundColor: colors.surfaceElevated,
    borderRadius: layout.radius.md,
    paddingHorizontal: layout.spacing.md,
    color: colors.textPrimary,
    fontSize: layout.font.body,
  },
  searchButton: {
    minWidth: layout.touchTargetMin,
    minHeight: layout.touchTargetMin,
    paddingHorizontal: layout.spacing.md,
    borderRadius: layout.radius.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonText: {
    color: colors.onAccent,
    fontSize: layout.font.body,
    fontWeight: layout.fontWeight.heavy,
  },
  iconButton: {
    width: layout.touchTargetMin,
    minHeight: layout.touchTargetMin,
    borderRadius: layout.radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonActive: {
    backgroundColor: colors.accent,
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
    borderRadius: layout.radius.pill,
    backgroundColor: colors.mapDim,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  chipText: {
    color: colors.textPrimary,
    fontSize: layout.font.label,
    fontWeight: layout.fontWeight.bold,
  },
  chipTextActive: {
    color: colors.onAccent,
  },
  results: {
    maxHeight: 240,
    backgroundColor: colors.surfaceElevated,
    borderRadius: layout.radius.md,
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

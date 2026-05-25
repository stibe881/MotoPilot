import { useState } from "react";
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
import * as Location from "expo-location";
import { geocode, type GeocodeResult } from "@/lib/routing";
import { useRideStore } from "@/store/useRideStore";
import { colors, layout } from "@/theme";
import type { RoutePreference } from "@/types/models";

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
  const insets = useSafeAreaInsets();
  const isNavigating = useRideStore((s) => s.isNavigating);
  const routing = useRideStore((s) => s.routing);
  const preference = useRideStore((s) => s.preference);
  const setPreference = useRideStore((s) => s.setPreference);
  const navigateTo = useRideStore((s) => s.navigateTo);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isNavigating || routing) return null;

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const near = await currentLatLng().catch(() => undefined);
      setResults(await geocode(query.trim(), near));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
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
      setError(e instanceof Error ? e.message : "Could not start navigation");
    }
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + layout.spacing.sm }]}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Where to?"
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
            <Text style={styles.searchButtonText}>Go</Text>
          )}
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
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {results.length > 0 ? (
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

import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatSpeed } from "@/lib/format";
import { useProfileStore } from "@/store/useProfileStore";
import { useRideStore } from "@/store/useRideStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { colors, layout } from "@/theme";

/** Bottom-left speedometer + posted speed-limit sign, shown while navigating. */
export function SpeedBadge() {
  const insets = useSafeAreaInsets();
  const isNavigating = useRideStore((s) => s.isNavigating);
  const speedMps = useRideStore((s) => s.currentSpeedMps);
  const speedLimitKmh = useRideStore((s) => s.currentSpeedLimit);
  const toleranceKmh = useSettingsStore((s) => s.speedToleranceKmh);
  const units = useProfileStore((s) => s.profile?.units ?? "metric");

  if (!isNavigating) return null;

  const { value, unit } = formatSpeed(speedMps, units);
  const limit =
    speedLimitKmh == null
      ? null
      : units === "imperial"
      ? Math.round(speedLimitKmh * 0.621371)
      : speedLimitKmh;

  // Speeding: compare in km/h, using the rider's configured tolerance.
  const speeding =
    speedLimitKmh != null &&
    speedMps != null &&
    speedMps >= 0 &&
    speedMps * 3.6 > speedLimitKmh + toleranceKmh;

  return (
    <View style={[styles.row, { bottom: insets.bottom + layout.spacing.lg }]} pointerEvents="none">
      <View style={[styles.badge, speeding && styles.badgeOver]}>
        <Text style={[styles.value, speeding && styles.valueOver]}>{value}</Text>
        <Text style={[styles.unit, speeding && styles.valueOver]}>{unit}</Text>
      </View>
      {limit != null ? (
        <View style={styles.limitSign}>
          <Text style={styles.limitValue}>{limit}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: "absolute",
    left: layout.spacing.md,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: layout.spacing.sm,
  },
  badge: {
    minWidth: 88,
    backgroundColor: colors.surfaceElevated,
    borderRadius: layout.radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: layout.spacing.sm,
    paddingHorizontal: layout.spacing.md,
    alignItems: "center",
  },
  badgeOver: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  value: {
    color: colors.textPrimary,
    fontSize: layout.font.display,
    fontWeight: layout.fontWeight.heavy,
  },
  valueOver: {
    color: "#FFFFFF",
  },
  unit: {
    color: colors.textSecondary,
    fontSize: layout.font.label,
    fontWeight: layout.fontWeight.bold,
  },
  // Round white sign with a red ring, like a European speed-limit sign.
  limitSign: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    borderWidth: 6,
    borderColor: "#D52B1E",
    alignItems: "center",
    justifyContent: "center",
  },
  limitValue: {
    color: "#000000",
    fontSize: 24,
    fontWeight: "800",
  },
});

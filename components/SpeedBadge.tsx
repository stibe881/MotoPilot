import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatSpeed } from "@/lib/format";
import { useProfileStore } from "@/store/useProfileStore";
import { useRideStore } from "@/store/useRideStore";
import { colors, layout } from "@/theme";

/** Bottom-left speedometer, shown only while navigating. */
export function SpeedBadge() {
  const insets = useSafeAreaInsets();
  const isNavigating = useRideStore((s) => s.isNavigating);
  const speedMps = useRideStore((s) => s.currentSpeedMps);
  const units = useProfileStore((s) => s.profile?.units ?? "metric");

  if (!isNavigating) return null;

  const { value, unit } = formatSpeed(speedMps, units);

  return (
    <View style={[styles.badge, { bottom: insets.bottom + layout.spacing.lg }]} pointerEvents="none">
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    left: layout.spacing.md,
    minWidth: 88,
    backgroundColor: colors.surfaceElevated,
    borderRadius: layout.radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: layout.spacing.sm,
    paddingHorizontal: layout.spacing.md,
    alignItems: "center",
  },
  value: {
    color: colors.textPrimary,
    fontSize: layout.font.display,
    fontWeight: layout.fontWeight.heavy,
  },
  unit: {
    color: colors.textSecondary,
    fontSize: layout.font.label,
    fontWeight: layout.fontWeight.bold,
  },
});

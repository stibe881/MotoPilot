import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BigButton } from "@/components/ui/BigButton";
import { formatDistance, formatDuration, formatEta } from "@/lib/format";
import { useRideStore } from "@/store/useRideStore";
import { colors, layout } from "@/theme";

// Turn-by-turn banner. Renders nothing unless a route is active. Step matching
// to live GPS is driven by the navigation hook (useNavigationTracker), which
// advances stepIndex; this is the presentation layer.
export function NavBanner() {
  const insets = useSafeAreaInsets();
  const route = useRideStore((s) => s.route);
  const isNavigating = useRideStore((s) => s.isNavigating);
  const stepIndex = useRideStore((s) => s.stepIndex);
  const routing = useRideStore((s) => s.routing);
  const stop = useRideStore((s) => s.stopNavigation);

  if (!isNavigating && !routing) return null;

  const step = route?.steps[stepIndex];

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + layout.spacing.sm }]}>
      <View style={styles.banner}>
        <View style={styles.row}>
          <View style={styles.instructionBox}>
            <Text style={styles.instruction} numberOfLines={2}>
              {routing
                ? "Calculating route…"
                : step?.instruction ?? "Head to your destination"}
            </Text>
            {step ? (
              <Text style={styles.stepDistance}>
                {formatDistance(step.distanceMeters)}
              </Text>
            ) : null}
          </View>
          <BigButton iconOnly icon="close" variant="danger" onPress={stop} />
        </View>

        {route ? (
          <View style={styles.summary}>
            <Text style={styles.summaryText}>{formatDistance(route.distanceMeters)}</Text>
            <Text style={styles.summaryDot}>•</Text>
            <Text style={styles.summaryText}>{formatDuration(route.durationSecs)}</Text>
            <Text style={styles.summaryDot}>•</Text>
            <Text style={styles.summaryText}>ETA {formatEta(route.durationSecs)}</Text>
          </View>
        ) : null}
      </View>
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
  },
  banner: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: layout.radius.lg,
    padding: layout.spacing.md,
    gap: layout.spacing.sm,
    borderWidth: 2,
    borderColor: colors.info,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.spacing.md,
  },
  instructionBox: {
    flex: 1,
    gap: layout.spacing.xs,
  },
  instruction: {
    color: colors.textPrimary,
    fontSize: layout.font.title,
    fontWeight: layout.fontWeight.heavy,
  },
  stepDistance: {
    color: colors.info,
    fontSize: layout.font.body,
    fontWeight: layout.fontWeight.bold,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.spacing.sm,
  },
  summaryText: {
    color: colors.textSecondary,
    fontSize: layout.font.body,
    fontWeight: layout.fontWeight.bold,
  },
  summaryDot: {
    color: colors.textDisabled,
  },
});

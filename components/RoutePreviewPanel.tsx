import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BigButton } from "@/components/ui/BigButton";
import { formatDistance, formatDuration, formatEta } from "@/lib/format";
import { useProfileStore } from "@/store/useProfileStore";
import { useRideStore } from "@/store/useRideStore";
import { colors, layout } from "@/theme";

/**
 * Bottom sheet shown after a route is planned. Lets the rider review the
 * route (which is editable by dragging pins on the map) and explicitly START
 * turn-by-turn navigation, or discard it.
 */
export function RoutePreviewPanel() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isPreviewing = useRideStore((s) => s.isPreviewing);
  const route = useRideStore((s) => s.route);
  const routing = useRideStore((s) => s.routing);
  const destination = useRideStore((s) => s.destination);
  const waypoints = useRideStore((s) => s.waypoints);
  const removeWaypoint = useRideStore((s) => s.removeWaypoint);
  const start = useRideStore((s) => s.startNavigation);
  const cancel = useRideStore((s) => s.stopNavigation);
  const units = useProfileStore((s) => s.profile?.units ?? "metric");

  if (!isPreviewing) return null;

  // Editable intermediate stops (exclude start at 0 and the final endpoint).
  const stops = waypoints
    .map((_, i) => i)
    .filter((i) => i >= 1 && i <= waypoints.length - 2);

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + layout.spacing.md }]}>
      <View style={styles.panel}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {destination?.label ?? t("plan.title")}
          </Text>
          <View style={styles.hint}>
            <Ionicons name="move" size={14} color={colors.textSecondary} />
            <Text style={styles.hintText}>{t("plan.editHint")}</Text>
          </View>
        </View>

        {route ? (
          <View style={styles.summary}>
            <Text style={styles.summaryText}>{formatDistance(route.distanceMeters, units)}</Text>
            <Text style={styles.summaryDot}>•</Text>
            <Text style={styles.summaryText}>{formatDuration(route.durationSecs)}</Text>
            <Text style={styles.summaryDot}>•</Text>
            <Text style={styles.summaryText}>
              {t("nav.eta")} {formatEta(route.durationSecs)}
            </Text>
            {routing ? <ActivityIndicator size="small" color={colors.info} style={styles.spin} /> : null}
          </View>
        ) : (
          <View style={styles.summary}>
            <ActivityIndicator size="small" color={colors.info} />
            <Text style={styles.summaryText}>{t("nav.calculating")}</Text>
          </View>
        )}

        {stops.length > 0 ? (
          <View style={styles.stops}>
            {stops.map((i) => (
              <View key={i} style={styles.stopRow}>
                <Ionicons name="location" size={16} color={colors.accent} />
                <Text style={styles.stopText}>{t("plan.stopPin", { n: i })}</Text>
                <Pressable
                  onPress={() => removeWaypoint(i)}
                  hitSlop={8}
                  style={styles.stopDelete}
                  accessibilityRole="button"
                  accessibilityLabel={t("plan.removeStop", { n: i })}
                >
                  <Ionicons name="trash" size={18} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.addHint}>
          <Ionicons name="add-circle-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.hintText}>{t("plan.addHint")}</Text>
        </View>

        <View style={styles.actions}>
          <BigButton
            label={t("plan.discard")}
            icon="close"
            variant="neutral"
            onPress={cancel}
            style={styles.discard}
          />
          <BigButton
            label={t("plan.start")}
            icon="navigate"
            variant="primary"
            onPress={start}
            disabled={!route || routing}
            style={styles.startBtn}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: layout.spacing.md,
  },
  panel: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: layout.radius.lg,
    padding: layout.spacing.md,
    gap: layout.spacing.md,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  headerRow: {
    gap: layout.spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: layout.font.title,
    fontWeight: layout.fontWeight.heavy,
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.spacing.xs,
  },
  hintText: {
    color: colors.textSecondary,
    fontSize: layout.font.label,
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
  summaryDot: { color: colors.textDisabled },
  spin: { marginLeft: layout.spacing.xs },
  stops: {
    gap: layout.spacing.xs,
  },
  stopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.spacing.sm,
  },
  stopText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: layout.font.body,
    fontWeight: layout.fontWeight.bold,
  },
  stopDelete: {
    minHeight: 36,
    minWidth: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  addHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.spacing.xs,
  },
  actions: {
    flexDirection: "row",
    gap: layout.spacing.md,
  },
  discard: { flex: 1 },
  startBtn: { flex: 2 },
});

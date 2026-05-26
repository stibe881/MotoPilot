import { useTranslation } from "react-i18next";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
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
  const start = useRideStore((s) => s.startNavigation);
  const cancel = useRideStore((s) => s.stopNavigation);
  const units = useProfileStore((s) => s.profile?.units ?? "metric");

  if (!isPreviewing) return null;

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
  actions: {
    flexDirection: "row",
    gap: layout.spacing.md,
  },
  discard: { flex: 1 },
  startBtn: { flex: 2 },
});

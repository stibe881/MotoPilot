import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BigButton } from "@/components/ui/BigButton";
import { formatDistance, formatDuration, formatEta } from "@/lib/format";
import { saveRoute } from "@/lib/routes";
import { useProfileStore } from "@/store/useProfileStore";
import { useRideStore } from "@/store/useRideStore";
import { colors, layout } from "@/theme";

// Turn-by-turn banner. Renders nothing unless a route is active. Step matching
// to live GPS is driven by the navigation hook (useNavigationTracker), which
// advances stepIndex; this is the presentation layer.
export function NavBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const route = useRideStore((s) => s.route);
  const destination = useRideStore((s) => s.destination);
  const preference = useRideStore((s) => s.preference);
  const isNavigating = useRideStore((s) => s.isNavigating);
  const stepIndex = useRideStore((s) => s.stepIndex);
  const routing = useRideStore((s) => s.routing);
  const stop = useRideStore((s) => s.stopNavigation);
  const units = useProfileStore((s) => s.profile?.units ?? "metric");

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  if (!isNavigating && !routing) return null;

  const step = route?.steps[stepIndex];

  const onSave = async () => {
    if (!route || saveState !== "idle") return;
    setSaveState("saving");
    const name =
      destination?.label ?? t("nav.routeName", { date: new Date().toLocaleDateString() });
    try {
      await saveRoute(name, route, preference, destination);
      setSaveState("saved");
    } catch {
      setSaveState("idle");
    }
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + layout.spacing.sm }]}>
      <View style={styles.banner}>
        <View style={styles.row}>
          <View style={styles.instructionBox}>
            <Text style={styles.instruction} numberOfLines={2}>
              {routing
                ? t("nav.calculating")
                : step?.instruction ?? t("nav.head")}
            </Text>
            {step ? (
              <Text style={styles.stepDistance}>
                {formatDistance(step.distanceMeters, units)}
              </Text>
            ) : null}
          </View>
          <BigButton iconOnly icon="close" variant="danger" onPress={stop} />
        </View>

        {route ? (
          <View style={styles.summary}>
            <Text style={styles.summaryText}>{formatDistance(route.distanceMeters, units)}</Text>
            <Text style={styles.summaryDot}>•</Text>
            <Text style={styles.summaryText}>{formatDuration(route.durationSecs)}</Text>
            <Text style={styles.summaryDot}>•</Text>
            <Text style={styles.summaryText}>{t("nav.eta")} {formatEta(route.durationSecs)}</Text>
            <View style={styles.flexSpacer} />
            <Pressable
              style={styles.saveButton}
              onPress={onSave}
              disabled={saveState !== "idle"}
              accessibilityRole="button"
              accessibilityLabel={t("nav.saveRoute")}
            >
              <Ionicons
                name={saveState === "saved" ? "bookmark" : "bookmark-outline"}
                size={20}
                color={saveState === "saved" ? colors.success : colors.textPrimary}
              />
              <Text style={styles.saveText}>
                {saveState === "saved" ? t("nav.saved") : saveState === "saving" ? t("nav.saving") : t("nav.save")}
              </Text>
            </Pressable>
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
  flexSpacer: {
    flex: 1,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.spacing.xs,
    minHeight: 44,
    paddingHorizontal: layout.spacing.sm,
  },
  saveText: {
    color: colors.textPrimary,
    fontSize: layout.font.label,
    fontWeight: layout.fontWeight.bold,
  },
});


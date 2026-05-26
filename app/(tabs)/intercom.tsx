import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ScreenScaffold } from "@/components/ui/ScreenScaffold";
import { BigButton } from "@/components/ui/BigButton";
import { useIntercom } from "@/hooks/useIntercom";
import { colors, layout } from "@/theme";

function batteryColor(pct: number | null): string {
  if (pct == null) return colors.textDisabled;
  if (pct <= 15) return colors.danger;
  if (pct <= 35) return colors.warning;
  return colors.success;
}

export default function IntercomScreen() {
  const { t } = useTranslation();
  const {
    scanning,
    devices,
    connecting,
    error,
    connectedId,
    deviceName,
    battery,
    scan,
    connect,
    disconnect,
  } = useIntercom();

  const connected = connectedId !== null;

  return (
    <ScreenScaffold title={t("intercom.title")} subtitle={t("intercom.subtitle")} icon="bluetooth">
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{t("intercom.headset")}</Text>
          <Text style={[styles.statusValue, { color: connected ? colors.success : colors.textDisabled }]}>
            {connected ? deviceName ?? t("intercom.connected") : t("intercom.notConnected")}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{t("intercom.battery")}</Text>
          <Text style={[styles.statusValue, { color: batteryColor(battery) }]}>
            {battery != null ? `${battery}%` : "—"}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{t("intercom.audioRoute")}</Text>
          <Text style={styles.statusValue}>{connected ? t("intercom.headsetAuto") : "—"}</Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {connected ? (
        <BigButton label={t("intercom.disconnect")} icon="close-circle" variant="danger" onPress={disconnect} />
      ) : (
        <BigButton
          label={scanning ? t("intercom.scanning") : t("intercom.scan")}
          icon="search"
          variant="primary"
          loading={scanning || connecting}
          onPress={scan}
        />
      )}

      {!connected &&
        devices.map((d) => (
          <Pressable key={d.id} style={styles.deviceRow} onPress={() => connect(d.id, d.name)}>
            <Ionicons name="hardware-chip" size={26} color={colors.info} />
            <Text style={styles.deviceName} numberOfLines={1}>
              {d.name}
            </Text>
            {d.rssi != null ? <Text style={styles.rssi}>{t("intercom.dbm", { rssi: d.rssi })}</Text> : null}
          </Pressable>
        ))}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: layout.radius.md,
    padding: layout.spacing.lg,
    gap: layout.spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  statusRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    paddingVertical: 2,
  },
  statusLabel: { 
    color: colors.textSecondary, 
    fontSize: layout.font.label - 1, 
    fontWeight: layout.fontWeight.heavy,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusValue: { 
    color: colors.textPrimary, 
    fontSize: layout.font.body, 
    fontWeight: layout.fontWeight.heavy, 
  },
  error: { 
    color: colors.danger, 
    fontSize: layout.font.label, 
    fontWeight: layout.fontWeight.bold,
    paddingLeft: layout.spacing.xs,
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.spacing.md,
    minHeight: layout.touchTargetMin,
    paddingHorizontal: layout.spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: layout.radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  deviceName: { 
    flex: 1, 
    color: colors.textPrimary, 
    fontSize: layout.font.body, 
    fontWeight: layout.fontWeight.bold, 
  },
  rssi: { 
    color: colors.textSecondary, 
    fontSize: layout.font.label,
    fontWeight: layout.fontWeight.bold,
  },
});

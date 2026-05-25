import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
    <ScreenScaffold title="Intercom" subtitle="Cardo / Bluetooth headset" icon="bluetooth">
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Headset</Text>
          <Text style={[styles.statusValue, { color: connected ? colors.success : colors.textDisabled }]}>
            {connected ? deviceName ?? "Connected" : "Not connected"}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Battery</Text>
          <Text style={[styles.statusValue, { color: batteryColor(battery) }]}>
            {battery != null ? `${battery}%` : "—"}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Audio route</Text>
          <Text style={styles.statusValue}>{connected ? "Headset (auto)" : "—"}</Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {connected ? (
        <BigButton label="Disconnect" icon="close-circle" variant="danger" onPress={disconnect} />
      ) : (
        <BigButton
          label={scanning ? "Scanning…" : "Scan for devices"}
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
            {d.rssi != null ? <Text style={styles.rssi}>{d.rssi} dBm</Text> : null}
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
  },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusLabel: { color: colors.textSecondary, fontSize: layout.font.body },
  statusValue: { color: colors.textPrimary, fontSize: layout.font.body, fontWeight: layout.fontWeight.bold },
  error: { color: colors.danger, fontSize: layout.font.label, fontWeight: layout.fontWeight.bold },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.spacing.md,
    minHeight: layout.touchTargetMin,
    paddingHorizontal: layout.spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: layout.radius.md,
  },
  deviceName: { flex: 1, color: colors.textPrimary, fontSize: layout.font.body, fontWeight: layout.fontWeight.bold },
  rssi: { color: colors.textSecondary, fontSize: layout.font.label },
});

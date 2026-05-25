import { StyleSheet, Text, View } from "react-native";
import { ScreenScaffold } from "@/components/ui/ScreenScaffold";
import { BigButton } from "@/components/ui/BigButton";
import { colors, layout } from "@/theme";

// Cardo / intercom connectivity. BLE scanning, battery read-out and audio
// routing (react-native-ble-plx + AVAudioSession) will populate this screen.
export default function IntercomScreen() {
  return (
    <ScreenScaffold
      title="Intercom"
      subtitle="Cardo / Bluetooth headset"
      icon="bluetooth"
    >
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Headset</Text>
          <Text style={[styles.statusValue, { color: colors.textDisabled }]}>
            Not connected
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Battery</Text>
          <Text style={styles.statusValue}>—</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Audio route</Text>
          <Text style={styles.statusValue}>—</Text>
        </View>
      </View>

      <BigButton label="Scan for devices" icon="search" variant="primary" />
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
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    color: colors.textSecondary,
    fontSize: layout.font.body,
  },
  statusValue: {
    color: colors.textPrimary,
    fontSize: layout.font.body,
    fontWeight: layout.fontWeight.bold,
  },
});

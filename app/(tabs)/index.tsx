import { View, StyleSheet } from "react-native";
import { RainRadarMap } from "@/components/RainRadarMap";
import { colors } from "@/theme";

// Navigation dashboard — the "single pane of glass". The map fills the screen
// edge to edge; route polylines and turn-by-turn overlays will mount on top of
// the RainRadarMap in a later step.
export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <RainRadarMap />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

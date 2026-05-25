import { View, StyleSheet } from "react-native";
import { DestinationSearch } from "@/components/DestinationSearch";
import { RainRadarMap } from "@/components/RainRadarMap";
import { useNavigationTracker } from "@/hooks/useNavigationTracker";
import { colors } from "@/theme";

// Navigation dashboard — the "single pane of glass". The map fills the screen;
// the destination search overlays the top when idle, the turn-by-turn banner
// (rendered inside RainRadarMap) takes over while navigating.
export default function DashboardScreen() {
  useNavigationTracker();

  return (
    <View style={styles.container}>
      <RainRadarMap />
      <DestinationSearch />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

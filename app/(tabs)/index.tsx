import { View, StyleSheet } from "react-native";
import { DestinationSearch } from "@/components/DestinationSearch";
import { RainRadarMap } from "@/components/RainRadarMap";
import { RoutePreviewPanel } from "@/components/RoutePreviewPanel";
import { SpeedBadge } from "@/components/SpeedBadge";
import { useAutoSaveDrivenRoute } from "@/hooks/useAutoSaveDrivenRoute";
import { useNavigationTracker } from "@/hooks/useNavigationTracker";
import { useVoiceGuidance } from "@/hooks/useVoiceGuidance";
import { colors } from "@/theme";

// Navigation dashboard — the "single pane of glass". The map fills the screen;
// the destination search overlays the top when idle, the turn-by-turn banner
// (rendered inside RainRadarMap) takes over while navigating.
export default function DashboardScreen() {
  useNavigationTracker();
  useVoiceGuidance();
  useAutoSaveDrivenRoute();

  return (
    <View style={styles.container}>
      <RainRadarMap />
      <DestinationSearch />
      <RoutePreviewPanel />
      <SpeedBadge />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

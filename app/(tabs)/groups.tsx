import { StyleSheet, Text, View } from "react-native";
import { ScreenScaffold } from "@/components/ui/ScreenScaffold";
import { BigButton } from "@/components/ui/BigButton";
import { colors, layout } from "@/theme";

// Rider groups + live location sharing. Backed by the rider_groups /
// rider_locations tables via Supabase realtime in a later step.
export default function GroupsScreen() {
  return (
    <ScreenScaffold
      title="Group Ride"
      subtitle="Ride together, see everyone live"
      icon="people"
    >
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>You're not in a group ride yet.</Text>
      </View>

      <BigButton label="Create group" icon="add-circle" variant="primary" />
      <BigButton label="Join with code" icon="enter" variant="neutral" />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: layout.radius.md,
    padding: layout.spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: layout.font.body,
  },
});

import { StyleSheet, Text, View } from "react-native";
import { ScreenScaffold } from "@/components/ui/ScreenScaffold";
import { BigButton } from "@/components/ui/BigButton";
import { colors, layout } from "@/theme";

// Unified media player shell. Spotify (native SDK) / Apple Music (MusicKit)
// providers will feed this UI in a later step; the transport layout and
// glove-sized controls are established here.
export default function MediaScreen() {
  return (
    <ScreenScaffold
      title="Now Playing"
      subtitle="Spotify & Apple Music — controlled in-app"
      icon="musical-notes"
    >
      <View style={styles.artwork}>
        <Text style={styles.artworkHint}>Album Art</Text>
      </View>

      <View style={styles.trackInfo}>
        <Text style={styles.track} numberOfLines={1}>
          Not Connected
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          Link a music service to start playback
        </Text>
      </View>

      <View style={styles.transport}>
        <BigButton iconOnly icon="play-skip-back" variant="neutral" disabled />
        <BigButton iconOnly icon="play" variant="primary" disabled />
        <BigButton iconOnly icon="play-skip-forward" variant="neutral" disabled />
      </View>

      <View style={styles.providers}>
        <BigButton label="Connect Spotify" icon="link" variant="neutral" />
        <BigButton label="Connect Apple Music" icon="musical-note" variant="neutral" />
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  artwork: {
    aspectRatio: 1,
    borderRadius: layout.radius.lg,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  artworkHint: {
    color: colors.textDisabled,
    fontSize: layout.font.body,
  },
  trackInfo: {
    gap: layout.spacing.xs,
  },
  track: {
    color: colors.textPrimary,
    fontSize: layout.font.display,
    fontWeight: layout.fontWeight.heavy,
  },
  artist: {
    color: colors.textSecondary,
    fontSize: layout.font.body,
  },
  transport: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: layout.spacing.lg,
  },
  providers: {
    gap: layout.spacing.md,
  },
});

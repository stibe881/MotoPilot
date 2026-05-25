import { Image, StyleSheet, Text, View } from "react-native";
import { ScreenScaffold } from "@/components/ui/ScreenScaffold";
import { BigButton } from "@/components/ui/BigButton";
import { useMediaPlayer } from "@/hooks/useMediaPlayer";
import { colors, layout } from "@/theme";

// Unified media player. Controls delegate to whichever provider is connected
// (Spotify Web API / Apple Music MusicKit) via useMediaPlayer.
export default function MediaScreen() {
  const {
    nowPlaying,
    isConnected,
    play,
    pause,
    next,
    previous,
    connectSpotify,
    connectAppleMusic,
    disconnect,
  } = useMediaPlayer();

  const playing = nowPlaying?.isPlaying ?? false;
  const hasTrack = nowPlaying != null;

  return (
    <ScreenScaffold
      title="Now Playing"
      subtitle="Spotify & Apple Music — controlled in-app"
      icon="musical-notes"
    >
      <View style={styles.artwork}>
        {nowPlaying?.artworkUrl ? (
          <Image source={{ uri: nowPlaying.artworkUrl }} style={styles.artworkImage} />
        ) : (
          <Text style={styles.artworkHint}>Album Art</Text>
        )}
      </View>

      <View style={styles.trackInfo}>
        <Text style={styles.track} numberOfLines={1}>
          {nowPlaying?.title ?? (isConnected ? "Nothing playing" : "Not Connected")}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {nowPlaying?.artist ?? "Link a music service to start playback"}
        </Text>
      </View>

      <View style={styles.transport}>
        <BigButton iconOnly icon="play-skip-back" variant="neutral" disabled={!isConnected} onPress={previous} />
        <BigButton
          iconOnly
          icon={playing ? "pause" : "play"}
          variant="primary"
          disabled={!isConnected}
          onPress={() => (playing ? pause() : play())}
        />
        <BigButton iconOnly icon="play-skip-forward" variant="neutral" disabled={!isConnected} onPress={next} />
      </View>

      <View style={styles.providers}>
        {isConnected ? (
          <BigButton label="Disconnect" icon="close-circle" variant="neutral" onPress={disconnect} />
        ) : (
          <>
            <BigButton label="Connect Spotify" icon="link" variant="neutral" onPress={connectSpotify} />
            <BigButton
              label="Connect Apple Music"
              icon="musical-note"
              variant="neutral"
              onPress={connectAppleMusic}
            />
          </>
        )}
      </View>

      {!hasTrack && isConnected ? (
        <Text style={styles.hint}>Start playback in the app, then control it here.</Text>
      ) : null}
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
    overflow: "hidden",
  },
  artworkImage: { width: "100%", height: "100%" },
  artworkHint: { color: colors.textDisabled, fontSize: layout.font.body },
  trackInfo: { gap: layout.spacing.xs },
  track: { color: colors.textPrimary, fontSize: layout.font.display, fontWeight: layout.fontWeight.heavy },
  artist: { color: colors.textSecondary, fontSize: layout.font.body },
  transport: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: layout.spacing.lg,
  },
  providers: { gap: layout.spacing.md },
  hint: { color: colors.textSecondary, fontSize: layout.font.label, textAlign: "center" },
});

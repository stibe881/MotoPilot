import { Image, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ScreenScaffold } from "@/components/ui/ScreenScaffold";
import { BigButton } from "@/components/ui/BigButton";
import { useMediaPlayer } from "@/hooks/useMediaPlayer";
import { colors, layout } from "@/theme";

// Unified media player. Controls delegate to whichever provider is connected
// (Spotify Web API / Apple Music MusicKit) via useMediaPlayer.
export default function MediaScreen() {
  const { t } = useTranslation();
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
      title={t("media.title")}
      subtitle={t("media.subtitle")}
      icon="musical-notes"
    >
      <View style={styles.artwork}>
        {nowPlaying?.artworkUrl ? (
          <Image source={{ uri: nowPlaying.artworkUrl }} style={styles.artworkImage} />
        ) : (
          <Text style={styles.artworkHint}>{t("media.albumArt")}</Text>
        )}
      </View>

      <View style={styles.trackInfo}>
        <Text style={styles.track} numberOfLines={1}>
          {nowPlaying?.title ?? (isConnected ? t("media.nothingPlaying") : t("media.notConnected"))}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {nowPlaying?.artist ?? t("media.linkService")}
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
          <BigButton label={t("media.disconnect")} icon="close-circle" variant="neutral" onPress={disconnect} />
        ) : (
          <>
            <BigButton label={t("media.connectSpotify")} icon="link" variant="neutral" onPress={connectSpotify} />
            <BigButton
              label={t("media.connectApple")}
              icon="musical-note"
              variant="neutral"
              onPress={connectAppleMusic}
            />
          </>
        )}
      </View>

      {!hasTrack && isConnected ? (
        <Text style={styles.hint}>{t("media.hint")}</Text>
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
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  artworkImage: { width: "100%", height: "100%" },
  artworkHint: { color: colors.textDisabled, fontSize: layout.font.body, fontWeight: layout.fontWeight.bold },
  trackInfo: { gap: layout.spacing.xs, marginTop: layout.spacing.xs },
  track: { 
    color: colors.textPrimary, 
    fontSize: 32, 
    fontWeight: layout.fontWeight.heavy,
    letterSpacing: -0.5,
  },
  artist: { 
    color: colors.textSecondary, 
    fontSize: layout.font.body,
    fontWeight: layout.fontWeight.bold,
  },
  transport: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: layout.spacing.lg,
    backgroundColor: "rgba(20, 24, 36, 0.4)", // transparent controller backing card
    paddingVertical: layout.spacing.md,
    borderRadius: layout.radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  providers: { gap: layout.spacing.md },
  hint: { color: colors.textSecondary, fontSize: layout.font.label, textAlign: "center", fontWeight: layout.fontWeight.bold },
});

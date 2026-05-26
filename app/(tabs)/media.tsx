import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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
    saveManualToken,
    connectAppleMusic,
    disconnect,
  } = useMediaPlayer();

  const [showSetup, setShowSetup] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);

  const playing = nowPlaying?.isPlaying ?? false;
  const hasTrack = nowPlaying != null;

  const handleConnectSpotify = async () => {
    try {
      setSetupError(null);
      await connectSpotify();
    } catch (e) {
      if (e instanceof Error && e.message === "CLIENT_ID_MISSING") {
        setShowSetup(true);
      } else {
        setSetupError(e instanceof Error ? e.message : "Connection failed");
      }
    }
  };

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
            <BigButton label={t("media.connectSpotify")} icon="link" variant="neutral" onPress={handleConnectSpotify} />
            <BigButton
              label={t("media.connectApple")}
              icon="musical-note"
              variant="neutral"
              onPress={connectAppleMusic}
            />
          </>
        )}
      </View>

      {showSetup && !isConnected ? (
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>🔌 Spotify Real Connection Setup</Text>
          <Text style={styles.setupText}>
            Um echtes Spotify zu steuern, trage <Text style={styles.code}>EXPO_PUBLIC_SPOTIFY_CLIENT_ID</Text> in deine <Text style={styles.code}>.env</Text> ein (für vollen Login) ODER füge hier direkt einen temporären **Spotify Access Token** ein:
          </Text>

          <TextInput
            style={styles.setupInput}
            placeholder="Spotify Access Token hier einfügen..."
            placeholderTextColor={colors.textDisabled}
            value={tokenInput}
            onChangeText={setTokenInput}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.setupButtons}>
            <Pressable
              style={styles.setupSave}
              onPress={async () => {
                try {
                  setSetupError(null);
                  if (!tokenInput.trim()) {
                    setSetupError("Bitte gib einen gültigen Token ein.");
                    return;
                  }
                  await saveManualToken(tokenInput);
                  setShowSetup(false);
                  setTokenInput("");
                } catch (e) {
                  setSetupError(e instanceof Error ? e.message : "Fehler beim Speichern");
                }
              }}
            >
              <Text style={styles.setupSaveText}>Token speichern</Text>
            </Pressable>
            <Pressable style={styles.setupCancel} onPress={() => setShowSetup(false)}>
              <Text style={styles.setupCancelText}>Abbrechen</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {setupError ? <Text style={styles.setupErrorText}>{setupError}</Text> : null}

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
  
  // Setup Card styles
  setupCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: layout.radius.md,
    padding: layout.spacing.md,
    gap: layout.spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: layout.spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  setupTitle: {
    color: colors.textPrimary,
    fontSize: layout.font.body,
    fontWeight: layout.fontWeight.heavy,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  setupText: {
    color: colors.textSecondary,
    fontSize: layout.font.label,
    lineHeight: 18,
  },
  code: {
    color: colors.accent,
    fontSize: layout.font.label - 1,
    fontWeight: layout.fontWeight.bold,
  },
  setupInput: {
    minHeight: layout.touchTargetMin,
    backgroundColor: "rgba(20, 24, 36, 0.4)",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    paddingHorizontal: layout.spacing.md,
    color: colors.textPrimary,
    fontSize: layout.font.label,
    marginVertical: 4,
  },
  setupButtons: {
    flexDirection: "row",
    gap: layout.spacing.sm,
  },
  setupSave: {
    flex: 1,
    minHeight: 40,
    backgroundColor: colors.accent,
    borderRadius: layout.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  setupSaveText: {
    color: colors.onAccent,
    fontWeight: layout.fontWeight.bold,
    fontSize: layout.font.label,
  },
  setupCancel: {
    flex: 1,
    minHeight: 40,
    backgroundColor: "rgba(20, 24, 36, 0.3)",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: layout.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  setupCancelText: {
    color: colors.textSecondary,
    fontWeight: layout.fontWeight.bold,
    fontSize: layout.font.label,
  },
  setupErrorText: {
    color: colors.danger,
    fontSize: layout.font.label,
    fontWeight: layout.fontWeight.bold,
    textAlign: "center",
    marginTop: 4,
  },
});

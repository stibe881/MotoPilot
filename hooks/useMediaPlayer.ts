import { useCallback, useEffect } from "react";
import * as Linking from "expo-linking";
import { appleMusicProvider, requestAppleMusicAuth } from "@/lib/media/appleMusic";
import { spotifyProvider } from "@/lib/media/spotify";
import type { MediaProvider } from "@/lib/media/types";
import { useMediaStore } from "@/store/useMediaStore";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { ServiceProvider } from "@/types/models";

const POLL_MS = 4000;

function providerFor(id: ServiceProvider | null): MediaProvider | null {
  if (id === "spotify") return spotifyProvider;
  if (id === "apple_music") return appleMusicProvider;
  return null;
}

export function useMediaPlayer() {
  const { user } = useAuth();
  const provider = useMediaStore((s) => s.provider);
  const nowPlaying = useMediaStore((s) => s.nowPlaying);
  const setProvider = useMediaStore((s) => s.setProvider);
  const setNowPlaying = useMediaStore((s) => s.setNowPlaying);

  const active = providerFor(provider);

  const refresh = useCallback(async () => {
    if (!active) return;
    try {
      setNowPlaying(await active.getNowPlaying());
    } catch {
      /* transient — keep last known track */
    }
  }, [active, setNowPlaying]);

  // Poll the active provider for the current track.
  useEffect(() => {
    if (!active) return;
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [active, refresh]);

  // Listen to incoming deep links for Spotify OAuth callback
  useEffect(() => {
    const handleUrl = async (event: { url: string }) => {
      const url = event.url;
      // Support both Expo Go (contains /--/redirect) and standalone (motopilot://redirect)
      if (!url.includes("/--/redirect") && !url.startsWith("motopilot://redirect")) return;

      const hash = url.split("#")[1];
      if (!hash) return;

      // Simple URL parameter extraction
      const parts = hash.split("&");
      let token: string | null = null;
      let expiresSec: string | null = null;

      for (const part of parts) {
        const [key, val] = part.split("=");
        if (key === "access_token") token = val;
        if (key === "expires_in") expiresSec = val;
      }

      if (token && user?.id) {
        try {
          const { error } = await supabase.from("connected_services").upsert({
            user_id: user.id,
            provider: "spotify",
            access_token: token,
            expires_at: expiresSec
              ? new Date(Date.now() + parseInt(expiresSec) * 1000).toISOString()
              : new Date(Date.now() + 3600 * 1000).toISOString(),
          });
          if (!error) {
            setProvider("spotify");
            refresh();
          }
        } catch {
          // Silent catch
        }
      }
    };

    const sub = Linking.addEventListener("url", handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => sub.remove();
  }, [user, setProvider, refresh]);

  const control = useCallback(
    async (action: keyof Pick<MediaProvider, "play" | "pause" | "next" | "previous">) => {
      if (!active) return;
      await active[action]();
      // Optimistic toggle for play/pause; reconcile on next poll.
      if (action === "play" || action === "pause") {
        const np = useMediaStore.getState().nowPlaying;
        if (np) setNowPlaying({ ...np, isPlaying: action === "play" });
      }
      refresh();
    },
    [active, refresh, setNowPlaying]
  );

  const connectSpotify = useCallback(async () => {
    const clientId = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID;
    if (!clientId) {
      throw new Error("CLIENT_ID_MISSING");
    }

    const redirectUri = Linking.createURL("redirect");
    const scopes = [
      "user-modify-playback-state",
      "user-read-currently-playing",
      "user-read-playback-state"
    ];
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(scopes.join(" "))}`;

    await Linking.openURL(authUrl);
  }, []);

  const saveManualToken = useCallback(
    async (token: string) => {
      if (!user?.id) throw new Error("User not logged in");
      const cleanToken = token.trim();
      if (!cleanToken) throw new Error("Token cannot be empty");

      const { error } = await supabase.from("connected_services").upsert({
        user_id: user.id,
        provider: "spotify",
        access_token: cleanToken,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      });
      if (error) throw error;
      setProvider("spotify");
      refresh();
    },
    [user, setProvider, refresh]
  );

  const connectAppleMusic = useCallback(async () => {
    const ok = await requestAppleMusicAuth();
    if (ok) setProvider("apple_music");
    return ok;
  }, [setProvider]);

  return {
    provider,
    nowPlaying,
    isConnected: active !== null,
    play: () => control("play"),
    pause: () => control("pause"),
    next: () => control("next"),
    previous: () => control("previous"),
    connectSpotify,
    saveManualToken,
    connectAppleMusic,
    disconnect: () => {
      setProvider(null);
      setNowPlaying(null);
    },
  };
}

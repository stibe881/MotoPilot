import { useCallback, useEffect, useState } from "react";
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

  const [playlists, setPlaylists] = useState<any[]>([]);

  useEffect(() => {
    if (!active) {
      setPlaylists([]);
      return;
    }
    const getPlaylists = active.getPlaylists;
    if (!getPlaylists) {
      setPlaylists([]);
      return;
    }
    let activeRequest = true;
    const fetchPlaylists = async () => {
      try {
        const list = await getPlaylists();
        if (activeRequest) setPlaylists(list);
      } catch (err) {
        console.warn("Failed to fetch playlists:", err);
      }
    };
    fetchPlaylists();
    return () => {
      activeRequest = false;
    };
  }, [active]);

  // Automatically restore active provider on startup if a connection exists in Supabase
  useEffect(() => {
    if (!user?.id) return;
    const restoreConnection = async () => {
      try {
        const { data, error } = await supabase
          .from("connected_services")
          .select("provider")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!error && data?.provider) {
          setProvider(data.provider);
        }
      } catch (err) {
        console.error("Failed to restore connected service:", err);
      }
    };
    restoreConnection();
  }, [user, setProvider]);

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

      // Extract authorization code or error from query parameters
      const codeMatch = url.match(/[?&]code=([^&#]+)/);
      const code = codeMatch ? codeMatch[1] : null;

      const errorMatch = url.match(/[?&]error=([^&#]+)/);
      if (errorMatch) {
        console.error("Spotify Auth Rejected:", errorMatch[1]);
        return;
      }

      if (code && user?.id) {
        // Wait 500ms for the network interface to fully settle after foreground app transition
        await new Promise((resolve) => setTimeout(resolve, 500));

        try {
          const clientId = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID;
          const clientSecret = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_SECRET;
          const redirectUri = Linking.createURL("redirect");

          if (!clientId || !clientSecret) {
            console.error("Spotify Client Credentials missing in .env");
            return;
          }

          console.log("Exchanging Spotify code for token...", {
            clientId: clientId ? "Present" : "Missing",
            redirectUri,
          });

          // Exchange authorization code for access & refresh tokens
          // Sending client_id and client_secret directly in the body is officially supported
          // by Spotify and avoids potential Base64 encoding/header bugs in the native runtime.
          const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`,
          });

          if (!tokenResponse.ok) {
            const errText = await tokenResponse.text();
            throw new Error(`Spotify token exchange failed: ${errText}`);
          }

          const tokenData = await tokenResponse.json();
          const { access_token, refresh_token, expires_in } = tokenData;

          if (access_token) {
            const { error } = await supabase.from("connected_services").upsert(
              {
                user_id: user.id,
                provider: "spotify",
                access_token,
                refresh_token: refresh_token || null,
                expires_at: expires_in
                  ? new Date(Date.now() + expires_in * 1000).toISOString()
                  : new Date(Date.now() + 3600 * 1000).toISOString(),
              },
              { onConflict: "user_id,provider" }
            );

            if (!error) {
              setProvider("spotify");
              refresh();
            } else {
              console.error("Supabase storage error:", error.message);
            }
          }
        } catch (err) {
          console.error("Spotify Code Exchange Error:", err);
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
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(scopes.join(" "))}`;

    await Linking.openURL(authUrl);
  }, []);

  const saveManualToken = useCallback(
    async (token: string) => {
      if (!user?.id) throw new Error("User not logged in");
      const cleanToken = token.trim();
      if (!cleanToken) throw new Error("Token cannot be empty");

      const { error } = await supabase.from("connected_services").upsert(
        {
          user_id: user.id,
          provider: "spotify",
          access_token: cleanToken,
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        },
        { onConflict: "user_id,provider" }
      );
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
    playlists,
    playPlaylist: active?.playPlaylist ? active.playPlaylist : async () => {},
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

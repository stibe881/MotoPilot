import { useCallback, useEffect } from "react";
import { appleMusicProvider, requestAppleMusicAuth } from "@/lib/media/appleMusic";
import { spotifyProvider } from "@/lib/media/spotify";
import type { MediaProvider } from "@/lib/media/types";
import { useMediaStore } from "@/store/useMediaStore";
import type { ServiceProvider } from "@/types/models";

const POLL_MS = 4000;

function providerFor(id: ServiceProvider | null): MediaProvider | null {
  if (id === "spotify") return spotifyProvider;
  if (id === "apple_music") return appleMusicProvider;
  return null;
}

export function useMediaPlayer() {
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

  const connectSpotify = useCallback(() => {
    // OAuth (expo-auth-session / native SDK) populates connected_services with a
    // token; once present, the Web API provider works. Selecting it here.
    setProvider("spotify");
  }, [setProvider]);

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
    connectAppleMusic,
    disconnect: () => {
      setProvider(null);
      setNowPlaying(null);
    },
  };
}

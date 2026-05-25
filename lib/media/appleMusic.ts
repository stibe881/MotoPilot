import * as ExpoMusicKit from "expo-music-kit";
import type { MediaProvider, NowPlaying } from "@/lib/media/types";

// Apple Music via expo-music-kit (native MusicKit). The exact method surface
// varies between versions of expo-music-kit, so calls are accessed defensively;
// confirm the names against the installed version and tighten the typing.
const MK = ExpoMusicKit as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>;

async function invoke(name: string): Promise<void> {
  const fn = MK[name];
  if (typeof fn !== "function") {
    throw new Error(`expo-music-kit has no "${name}()" in this version`);
  }
  await fn();
}

export async function requestAppleMusicAuth(): Promise<boolean> {
  const fn = MK.requestAuthorization ?? MK.authorize;
  if (typeof fn !== "function") return false;
  const result = (await fn()) as unknown;
  return result === "authorized" || result === true;
}

interface MkNowPlaying {
  title?: string;
  artistName?: string;
  artworkUrl?: string;
  isPlaying?: boolean;
  playbackDuration?: number;
  currentPlaybackTime?: number;
}

export const appleMusicProvider: MediaProvider = {
  id: "apple_music",
  play: () => invoke("play"),
  pause: () => invoke("pause"),
  next: () => invoke("skipToNext"),
  previous: () => invoke("skipToPrevious"),
  async getNowPlaying(): Promise<NowPlaying | null> {
    const getter = MK.getCurrentSong ?? MK.getNowPlaying;
    if (typeof getter !== "function") return null;
    const song = (await getter()) as MkNowPlaying | null;
    if (!song?.title) return null;
    return {
      title: song.title,
      artist: song.artistName ?? "",
      artworkUrl: song.artworkUrl ?? null,
      isPlaying: song.isPlaying ?? false,
      durationMs: song.playbackDuration != null ? song.playbackDuration * 1000 : null,
      positionMs: song.currentPlaybackTime != null ? song.currentPlaybackTime * 1000 : null,
    };
  },
};

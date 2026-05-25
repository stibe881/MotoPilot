import type { MediaProvider, NowPlaying } from "@/lib/media/types";

// Apple Music (MusicKit) playback control requires a native binding that is not
// available as a stable Expo package today. Wire one of these up behind this
// provider, then replace the NOT_LINKED throws with real calls:
//   - expo-apple-music (Expo-friendly, early API), or
//   - @lomray/react-native-apple-music (bare RN), or
//   - a custom Expo Config Plugin linking MusicKit.framework directly.
//
// The MediaProvider interface below is what the player UI depends on, so the
// rest of the app needs no changes once the native module is in place.
const NOT_LINKED = "Apple Music native module is not linked yet";

export async function requestAppleMusicAuth(): Promise<boolean> {
  // TODO: call the native MusicKit authorization request once linked.
  return false;
}

export const appleMusicProvider: MediaProvider = {
  id: "apple_music",
  play: async () => {
    throw new Error(NOT_LINKED);
  },
  pause: async () => {
    throw new Error(NOT_LINKED);
  },
  next: async () => {
    throw new Error(NOT_LINKED);
  },
  previous: async () => {
    throw new Error(NOT_LINKED);
  },
  async getNowPlaying(): Promise<NowPlaying | null> {
    return null;
  },
};

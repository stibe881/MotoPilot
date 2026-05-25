import { create } from "zustand";
import type { NowPlaying } from "@/lib/media/types";
import type { ServiceProvider } from "@/types/models";

interface MediaStore {
  provider: ServiceProvider | null;
  nowPlaying: NowPlaying | null;
  setProvider: (provider: ServiceProvider | null) => void;
  setNowPlaying: (nowPlaying: NowPlaying | null) => void;
}

export const useMediaStore = create<MediaStore>((set) => ({
  provider: null,
  nowPlaying: null,
  setProvider: (provider) => set({ provider }),
  setNowPlaying: (nowPlaying) => set({ nowPlaying }),
}));

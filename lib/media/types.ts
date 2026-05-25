import type { ServiceProvider } from "@/types/models";

export interface NowPlaying {
  title: string;
  artist: string;
  artworkUrl: string | null;
  isPlaying: boolean;
  durationMs: number | null;
  positionMs: number | null;
}

export interface MediaProvider {
  id: ServiceProvider;
  play(): Promise<void>;
  pause(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  getNowPlaying(): Promise<NowPlaying | null>;
}

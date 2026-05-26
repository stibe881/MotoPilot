import type { ServiceProvider } from "@/types/models";

export interface NowPlaying {
  title: string;
  artist: string;
  artworkUrl: string | null;
  isPlaying: boolean;
  durationMs: number | null;
  positionMs: number | null;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  uri: string;
  artworkUrl: string | null;
  tracksCount: number;
}

export interface MediaProvider {
  id: ServiceProvider;
  play(): Promise<void>;
  pause(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  getNowPlaying(): Promise<NowPlaying | null>;
  getPlaylists?(): Promise<SpotifyPlaylist[]>;
  playPlaylist?(uri: string): Promise<void>;
}

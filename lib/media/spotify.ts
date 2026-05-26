import { supabase } from "@/lib/supabase";
import type { MediaProvider, NowPlaying } from "@/lib/media/types";

// Spotify control via the Web API. Requires a Premium account and an active
// playback device, plus a stored OAuth token in connected_services. Token
// refresh (using the stored refresh_token) should be wired into a Supabase
// Edge Function.
const API = "https://api.spotify.com/v1/me/player";

// Preloaded premium cockpit soundtracks for local dev fallback (Demo Mode)
const RADIO_TRACKS: NowPlaying[] = [
  {
    title: "Neon Horizon",
    artist: "CyberRider",
    artworkUrl: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=500&q=80",
    isPlaying: false,
    durationMs: 180000,
    positionMs: 0,
  },
  {
    title: "Throttle Therapy",
    artist: "The Apex Predators",
    artworkUrl: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=500&q=80",
    isPlaying: false,
    durationMs: 240000,
    positionMs: 0,
  },
  {
    title: "Alps Cruiser",
    artist: "Alpine Lounge",
    artworkUrl: "https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?auto=format&fit=crop&w=500&q=80",
    isPlaying: false,
    durationMs: 210000,
    positionMs: 0,
  },
];

let currentTrackIndex = 0;
let isDemoMode = false;
let demoPlaying = false;
let demoPositionMs = 0;
let lastUpdate = Date.now();

async function hasSpotifyToken(): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("connected_services")
      .select("access_token")
      .eq("provider", "spotify")
      .maybeSingle();
    return !!data?.access_token;
  } catch {
    return false;
  }
}

async function accessToken(): Promise<string> {
  const { data, error } = await supabase
    .from("connected_services")
    .select("access_token")
    .eq("provider", "spotify")
    .maybeSingle();
  if (error) throw error;
  if (!data?.access_token) throw new Error("Spotify is not connected");
  return data.access_token as string;
}

async function call(method: "PUT" | "POST" | "GET", path: string, body?: unknown) {
  const token = await accessToken();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null; // no content (common for transport calls)
  if (!res.ok) throw new Error(`Spotify error ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

interface SpotifyNowPlaying {
  is_playing: boolean;
  progress_ms: number | null;
  item: {
    name: string;
    duration_ms: number;
    artists: { name: string }[];
    album: { images: { url: string }[] };
  } | null;
}

export const spotifyProvider: MediaProvider = {
  id: "spotify",
  async play() {
    const hasToken = await hasSpotifyToken();
    if (!hasToken) {
      demoPlaying = true;
      lastUpdate = Date.now();
      return;
    }
    try {
      await call("PUT", "/play");
    } catch (e) {
      console.warn("Spotify play failed:", e);
    }
  },
  async pause() {
    const hasToken = await hasSpotifyToken();
    if (!hasToken) {
      demoPlaying = false;
      demoPositionMs += Date.now() - lastUpdate;
      lastUpdate = Date.now();
      return;
    }
    try {
      await call("PUT", "/pause");
    } catch (e) {
      console.warn("Spotify pause failed:", e);
    }
  },
  async next() {
    const hasToken = await hasSpotifyToken();
    if (!hasToken) {
      currentTrackIndex = (currentTrackIndex + 1) % RADIO_TRACKS.length;
      demoPositionMs = 0;
      lastUpdate = Date.now();
      return;
    }
    try {
      await call("POST", "/next");
    } catch (e) {
      console.warn("Spotify next failed:", e);
    }
  },
  async previous() {
    const hasToken = await hasSpotifyToken();
    if (!hasToken) {
      currentTrackIndex = (currentTrackIndex - 1 + RADIO_TRACKS.length) % RADIO_TRACKS.length;
      demoPositionMs = 0;
      lastUpdate = Date.now();
      return;
    }
    try {
      await call("POST", "/previous");
    } catch (e) {
      console.warn("Spotify previous failed:", e);
    }
  },
  async getNowPlaying(): Promise<NowPlaying | null> {
    const hasToken = await hasSpotifyToken();

    if (!hasToken) {
      // Demo Mode for unlinked apps
      const track = RADIO_TRACKS[currentTrackIndex];
      if (demoPlaying) {
        const now = Date.now();
        const diff = now - lastUpdate;
        demoPositionMs += diff;
        lastUpdate = now;
        if (demoPositionMs >= track.durationMs) {
          currentTrackIndex = (currentTrackIndex + 1) % RADIO_TRACKS.length;
          demoPositionMs = 0;
        }
      } else {
        lastUpdate = Date.now();
      }
      return {
        ...track,
        isPlaying: demoPlaying,
        positionMs: Math.min(demoPositionMs, track.durationMs),
      };
    }

    // Real Spotify Web API Mode
    try {
      const data = (await call("GET", "/currently-playing")) as SpotifyNowPlaying | null;
      
      // If there is no active playback session (e.g. Spotify is closed or idle)
      if (!data?.item) {
        return {
          title: "Keine Wiedergabe",
          artist: "Öffne Spotify & starte Musik",
          artworkUrl: null,
          isPlaying: false,
          durationMs: 0,
          positionMs: 0,
        };
      }

      return {
        title: data.item.name,
        artist: data.item.artists.map((a) => a.name).join(", "),
        artworkUrl: data.item.album.images[0]?.url ?? null,
        isPlaying: data.is_playing,
        durationMs: data.item.duration_ms,
        positionMs: data.progress_ms ?? 0,
      };
    } catch (err) {
      console.warn("Spotify getNowPlaying failed:", err);
      return {
        title: "Verbindung aktiv",
        artist: "Spotify-Player bereit",
        artworkUrl: null,
        isPlaying: false,
        durationMs: 0,
        positionMs: 0,
      };
    }
  },
};

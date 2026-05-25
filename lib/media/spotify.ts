import { supabase } from "@/lib/supabase";
import type { MediaProvider, NowPlaying } from "@/lib/media/types";

// Spotify control via the Web API. Requires a Premium account and an active
// playback device, plus a stored OAuth token in connected_services. Token
// refresh (using the stored refresh_token) should be wired into a Supabase
// Edge Function; here we assume access_token is currently valid.
const API = "https://api.spotify.com/v1/me/player";

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
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
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
  play: () => call("PUT", "/play").then(() => undefined),
  pause: () => call("PUT", "/pause").then(() => undefined),
  next: () => call("POST", "/next").then(() => undefined),
  previous: () => call("POST", "/previous").then(() => undefined),
  async getNowPlaying(): Promise<NowPlaying | null> {
    const data = (await call("GET", "/currently-playing")) as SpotifyNowPlaying | null;
    if (!data?.item) return null;
    return {
      title: data.item.name,
      artist: data.item.artists.map((a) => a.name).join(", "),
      artworkUrl: data.item.album.images[0]?.url ?? null,
      isPlaying: data.is_playing,
      durationMs: data.item.duration_ms,
      positionMs: data.progress_ms,
    };
  },
};

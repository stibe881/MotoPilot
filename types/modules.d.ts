// Fallback declaration: some versions of expo-music-kit ship without bundled
// TypeScript types. The Apple Music provider accesses it defensively at runtime
// (see lib/media/appleMusic.ts).
declare module "expo-music-kit";

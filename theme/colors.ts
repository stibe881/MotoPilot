// High-contrast dark palette tuned for direct-sunlight readability on a
// handlebar mount. Pure-black base maximizes OLED contrast; the accent is a
// hi-vis safety orange so primary actions stay legible behind a tinted visor.
export const colors = {
  background: "#000000", // deep OLED black for handlebar visibility
  surface: "#0C0E14", // graphite slate cockpit base
  surfaceElevated: "#141824", // elevated slate-blue dashboard elements
  border: "#1F2433", // crisp slate outline
  borderAccent: "rgba(255, 94, 0, 0.25)", // neon orange translucent border

  textPrimary: "#F5F7FA", // titanium off-white
  textSecondary: "#9EA4B0", // cool titanium grey
  textDisabled: "#4A4F5A", // matte slate

  accent: "#FF5E00", // vibrant cyber-sports safety orange
  accentPressed: "#E04B00",
  onAccent: "#000000",
  accentGlow: "rgba(255, 94, 0, 0.15)", // subtle orange backing shadow

  success: "#00FF87", // neon electric green
  warning: "#FFD600", // neon yellow
  danger: "#FF1E56", // neon cyber crimson
  info: "#00E5FF", // neon cyan

  mapDim: "rgba(0,0,0,0.5)", // dark scrim behind dashboard cards
} as const;

export type ColorToken = keyof typeof colors;

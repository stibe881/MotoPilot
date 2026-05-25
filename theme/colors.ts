// High-contrast dark palette tuned for direct-sunlight readability on a
// handlebar mount. Pure-black base maximizes OLED contrast; the accent is a
// hi-vis safety orange so primary actions stay legible behind a tinted visor.
export const colors = {
  background: "#000000",
  surface: "#141414",
  surfaceElevated: "#1F1F1F",
  border: "#2E2E2E",

  textPrimary: "#FFFFFF",
  textSecondary: "#B5B5B5",
  textDisabled: "#5C5C5C",

  accent: "#FF7A00", // hi-vis safety orange — primary actions
  accentPressed: "#CC6200",
  onAccent: "#000000",

  success: "#16C172", // connected / go
  warning: "#FFD400", // caution
  danger: "#FF3B30", // disconnect / end call
  info: "#00B7FF", // navigation / data

  mapDim: "rgba(0,0,0,0.45)", // scrim behind overlay UI on the map
} as const;

export type ColorToken = keyof typeof colors;

// Sizing tokens. The minimum interactive size is 60pt so a gloved fingertip
// reliably hits any control (Apple HIG minimum is 44pt — we go larger for
// riding gloves and vibration).
export const layout = {
  touchTargetMin: 60,
  touchTargetLarge: 88,

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  radius: {
    sm: 8,
    md: 16,
    lg: 24,
    pill: 999,
  },

  // Oversized type for glance-and-ride legibility.
  font: {
    label: 16,
    body: 18,
    title: 24,
    display: 40,
    hero: 64,
  },

  fontWeight: {
    regular: "500",
    bold: "700",
    heavy: "800",
  },
} as const;

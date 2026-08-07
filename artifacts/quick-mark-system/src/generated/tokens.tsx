/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#F7F9FC",
      "foreground": "#132238",
      "border": "#DDE5F0",
      "card": "#FFFFFF",
      "cardForeground": "#132238",
      "popover": "#FFFFFF",
      "popoverForeground": "#132238",
      "primary": "#1457FF",
      "primaryForeground": "#FFFFFF",
      "secondary": "#EAF0FF",
      "secondaryForeground": "#173776",
      "muted": "#EEF2F7",
      "mutedForeground": "#6C7B91",
      "accent": "#FFF0E8",
      "accentForeground": "#A8471F",
      "destructive": "#E5484D",
      "destructiveForeground": "#FFFFFF",
      "input": "#DDE5F0",
      "ring": "#1457FF",
      "chart1": "#FF5C5C",
      "chart2": "#FFD166",
      "chart3": "#49D6B2",
      "chart4": "#25334A",
      "chart5": "#8EA6FF",
      "sidebar": "#F7F9FC",
      "sidebarForeground": "#132238",
      "sidebarBorder": "#DDE5F0",
      "sidebarPrimary": "#1457FF",
      "sidebarPrimaryForeground": "#FFFFFF",
      "sidebarAccent": "#EAF0FF",
      "sidebarAccentForeground": "#173776",
      "sidebarRing": "#1457FF",
      "editorBackground": "#111C2F",
      "editorSurface": "#25334A"
    },
    "dark": {
      "background": "#111C2F",
      "foreground": "#FFFFFF",
      "border": "#3A4860",
      "card": "#25334A",
      "cardForeground": "#FFFFFF",
      "popover": "#25334A",
      "popoverForeground": "#FFFFFF",
      "primary": "#6B8DFF",
      "primaryForeground": "#FFFFFF",
      "secondary": "#33456A",
      "secondaryForeground": "#EAF0FF",
      "muted": "#1C2B43",
      "mutedForeground": "#9EABC1",
      "accent": "#4A352D",
      "accentForeground": "#FFD4BE",
      "destructive": "#FF6B70",
      "destructiveForeground": "#FFFFFF",
      "input": "#3A4860",
      "ring": "#6B8DFF",
      "chart1": "#FF5C5C",
      "chart2": "#FFD166",
      "chart3": "#49D6B2",
      "chart4": "#8EA6FF",
      "chart5": "#FF9E80",
      "sidebar": "#111C2F",
      "sidebarForeground": "#FFFFFF",
      "sidebarBorder": "#3A4860",
      "sidebarPrimary": "#6B8DFF",
      "sidebarPrimaryForeground": "#FFFFFF",
      "sidebarAccent": "#25334A",
      "sidebarAccentForeground": "#FFFFFF",
      "sidebarRing": "#6B8DFF",
      "editorBackground": "#111C2F",
      "editorSurface": "#25334A"
    }
  },
  "fontFamily": {
    "sans": [
      "Inter",
      "sans-serif"
    ],
    "serif": [
      "Georgia",
      "serif"
    ],
    "mono": [
      "Menlo",
      "monospace"
    ]
  },
  "radius": "0.5rem",
  "spacing": "0.25rem"
} as const;

export type Tokens = typeof tokens;
export default tokens;

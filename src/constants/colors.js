// src/constants/colors.js
// Calm Reset - Vibrant Dusty Rose Theme

const colors = {
  // --- Primary (Vibrant Rose) -----------------------------
  // Buttons, active states, CTAs
  primary: "#E07A8B",
  primaryLight: "#F6C3CD",   // tags, soft highlights
  primaryDark: "#B04D63",    // pressed states, borders

  // --- Background -----------------------------------------
  // Main app background - clean and breathable
  background: "#FFF6F8",

  // --- Surface / Cards ------------------------------------
  // Cards, sections, containers
  surface: "#FFEFF3",
  surfaceDark: "#F5D9E1",    // nested cards, dividers

  // --- Accent ---------------------------------------------
  // Mood icons, emotional highlights, small UI touches
  accent: "#8FB8A8",         // soft green for balance
  accentLight: "#DDEBE6",

  // --- Text -----------------------------------------------
  textPrimary: "#2A2426",    // headings, body
  textSecondary: "#6B5A61",  // subtitles, meta info
  textMuted: "#A997A1",      // placeholders, hints
  textInverse: "#FFF7FA",    // text on dark/primary backgrounds

  // --- Semantic -------------------------------------------
  success: "#8FB8A8",
  warning: "#E8B07C",
  error: "#D86A6A",
  info: "#96A9C1",

  // --- Border ---------------------------------------------
  border: "rgba(224, 122, 139, 0.35)",
  borderStrong: "rgba(224, 122, 139, 0.6)",

  // --- Mood Scale (for mood tracker) ----------------------
  // Maps 1-5 mood levels to visual colors
  mood: {
    1: "#E07A8B",   // low - vibrant rose
    2: "#E9A0AD",
    3: "#D1B0C4",
    4: "#B7C2CD",
    5: "#8FB8A8",   // high - calm green
  },

  // --- Overlay --------------------------------------------
  overlay: "rgba(42, 36, 38, 0.4)",
  overlayLight: "rgba(255, 246, 248, 0.9)",
};

export default colors;

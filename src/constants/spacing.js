// src/constants/spacing.js
// Consistent spacing + shape system across the app

const spacing = {
  // --- Base Spacing Scale ---------------------------------
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 56,

  // --- Screen Padding -------------------------------------
  screenHorizontal: 20,
  screenVertical: 24,

  // --- Component Gaps -------------------------------------
  cardPadding: 16,
  cardGap: 12,           // gap between cards
  sectionGap: 24,        // gap between sections

  // --- Border Radius --------------------------------------
  // Soft and rounded — matches the warm, calm aesthetic
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 100,           // pills, mood dots, avatars
  },

  // --- Icon Sizes -----------------------------------------
  icon: {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  },

  // --- Avatar / Dot Sizes ---------------------------------
  avatar: {
    sm: 32,
    md: 44,
    lg: 56,
  },

  moodDot: {
    height: 8,
    borderRadius: 100,
  },
};

export default spacing;

// src/constants/typography.js
// Font pairing: DM Serif Display (headings) + DM Sans (body/UI)
//
// Install:
//   expo install expo-font @expo-google-fonts/dm-sans @expo-google-fonts/dm-serif-display
//
// Load in App.js:
//   import { useFonts, DMSans_400Regular, DMSans_500Medium } from "@expo-google-fonts/dm-sans";
//   import { DMSerifDisplay_400Regular } from "@expo-google-fonts/dm-serif-display";

const typography = {
  // --- Font Families --------------------------------------
  fonts: {
    heading: "DMSerifDisplay_400Regular",   // warm, elegant - for welcome titles, section headers
    body: "DMSans_400Regular",              // clean, readable - all UI text
    bodyMedium: "DMSans_500Medium",         // buttons, labels, card titles
  },

  // --- Font Sizes -----------------------------------------
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    base: 17,
    lg: 19,
    xl: 22,
    "2xl": 26,
    "3xl": 30,
    "4xl": 36,
  },

  // --- Line Heights ---------------------------------------
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },

  // --- Letter Spacing -------------------------------------
  letterSpacing: {
    tight: -0.3,
    normal: 0,
    wide: 0.4,
    wider: 0.8,   // for small caps labels, tags
  },

  // --- Preset Styles --------------------------------------
  // Use these directly in StyleSheet.create()
  presets: {
    // "Welcome back, Sarah"
    welcomeTitle: {
      fontFamily: "DMSerifDisplay_400Regular",
      fontSize: 30,
      lineHeight: 38,
      letterSpacing: -0.3,
    },
    // Screen section headers
    sectionTitle: {
      fontFamily: "DMSerifDisplay_400Regular",
      fontSize: 22,
      lineHeight: 30,
    },
    // Card titles, "Today's mood"
    cardTitle: {
      fontFamily: "DMSans_500Medium",
      fontSize: 15,
      lineHeight: 22,
    },
    // Body text, descriptions
    body: {
      fontFamily: "DMSans_400Regular",
      fontSize: 16,
      lineHeight: 26,
    },
    // Secondary / muted body
    bodySmall: {
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
      lineHeight: 22,
    },
    // Buttons
    button: {
      fontFamily: "DMSans_500Medium",
      fontSize: 16,
      letterSpacing: 0.2,
    },
    // Tags, labels, pills
    label: {
      fontFamily: "DMSans_500Medium",
      fontSize: 12,
      letterSpacing: 0.4,
    },
    // Caption / metadata
    caption: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      lineHeight: 18,
    },
  },
};

export default typography;

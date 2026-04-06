// src/theme/index.js
// Single import for all design tokens
//
// Usage:
//   import theme from "../theme";
//   theme.colors.primary
//   theme.typography.presets.welcomeTitle
//   theme.spacing.cardPadding

import colors from "../constants/colors";
import typography from "../constants/typography";
import spacing from "../constants/spacing";

const theme = {
  colors,
  typography,
  spacing,
};

export default theme;

// src/components/Card.js
// Themed card container — the warm beige surface used everywhere
//
// Usage:
//   <Card>...</Card>
//   <Card accent>...</Card>     ? adds left rose border for highlights
//   <Card flat>...</Card>       ? no border, blends into background

import React from "react";
import { View, StyleSheet } from "react-native";
import theme from "../theme";

const { colors, spacing } = theme;

const Card = ({ children, accent, flat, style, ...props }) => (
  <View
    style={[
      styles.card,
      accent && styles.accent,
      flat && styles.flat,
      style,
    ]}
    {...props}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radius.lg,
    padding: spacing.cardPadding,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  accent: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: 0,
    borderTopRightRadius: spacing.radius.lg,
    borderBottomRightRadius: spacing.radius.lg,
  },
  flat: {
    borderWidth: 0,
    backgroundColor: colors.surfaceDark,
  },
});

export default Card;

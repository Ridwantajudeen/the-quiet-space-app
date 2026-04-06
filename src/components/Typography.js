// src/components/Typography.js
// Reusable text components — consistent font style everywhere
//
// Usage:
//   <Heading>Welcome back, Sarah</Heading>
//   <Body muted>You've checked in 4 days in a row</Body>
//   <Label>Peaceful</Label>

import React from "react";
import { Text, StyleSheet } from "react-native";
import theme from "../theme";

const { colors, typography } = theme;

// "Welcome back, Sarah" — DM Serif Display
export const Heading = ({ children, style, ...props }) => (
  <Text style={[styles.heading, style]} {...props}>
    {children}
  </Text>
);

// Section headers — DM Serif Display, smaller
export const SectionTitle = ({ children, style, ...props }) => (
  <Text style={[styles.sectionTitle, style]} {...props}>
    {children}
  </Text>
);

// Card titles — DM Sans Medium
export const CardTitle = ({ children, style, ...props }) => (
  <Text style={[styles.cardTitle, style]} {...props}>
    {children}
  </Text>
);

// Standard body text — pass `muted` for secondary color
export const Body = ({ children, muted, style, ...props }) => (
  <Text
    style={[styles.body, muted && styles.bodyMuted, style]}
    {...props}
  >
    {children}
  </Text>
);

// Small body
export const BodySmall = ({ children, muted, style, ...props }) => (
  <Text
    style={[styles.bodySmall, muted && styles.bodyMuted, style]}
    {...props}
  >
    {children}
  </Text>
);

// Tag / pill labels
export const Label = ({ children, style, ...props }) => (
  <Text style={[styles.label, style]} {...props}>
    {children}
  </Text>
);

// Timestamps, metadata
export const Caption = ({ children, style, ...props }) => (
  <Text style={[styles.caption, style]} {...props}>
    {children}
  </Text>
);

const styles = StyleSheet.create({
  heading: {
    ...typography.presets.welcomeTitle,
    color: colors.textPrimary,
  },
  sectionTitle: {
    ...typography.presets.sectionTitle,
    color: colors.textPrimary,
  },
  cardTitle: {
    ...typography.presets.cardTitle,
    color: colors.textPrimary,
  },
  body: {
    ...typography.presets.body,
    color: colors.textPrimary,
  },
  bodyMuted: {
    color: colors.textSecondary,
  },
  bodySmall: {
    ...typography.presets.bodySmall,
    color: colors.textPrimary,
  },
  label: {
    ...typography.presets.label,
    color: colors.textPrimary,
  },
  caption: {
    ...typography.presets.caption,
    color: colors.textMuted,
  },
});

// src/components/Button.js
// Themed button — primary, outline, ghost variants
//
// Usage:
//   <Button onPress={handleSubmit}>Log mood</Button>
//   <Button variant="outline" onPress={handlePress}>Start writing</Button>
//   <Button variant="ghost" onPress={handlePress}>Skip</Button>

import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import theme from "../theme";

const { colors, typography, spacing } = theme;

const Button = ({
  children,
  onPress,
  variant = "primary",  // "primary" | "outline" | "ghost"
  size = "md",          // "sm" | "md" | "lg"
  loading = false,
  disabled = false,
  style,
  textStyle,
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        isDisabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? colors.textInverse : colors.primary}
        />
      ) : (
        <Text style={[styles.text, styles[`text_${variant}`], textStyle]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: spacing.radius.md,
  },

  // --- Variants -------------------------------------------
  primary: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: "transparent",
  },

  // --- Sizes ----------------------------------------------
  size_sm: {
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  size_md: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  size_lg: {
    paddingVertical: 14,
    paddingHorizontal: 28,
  },

  // --- Text -----------------------------------------------
  text: {
    ...typography.presets.button,
  },
  text_primary: {
    color: "#4A1828",   // dark rose — readable on primary bg
  },
  text_outline: {
    color: colors.textPrimary,
  },
  text_ghost: {
    color: colors.primary,
  },

  // --- State ----------------------------------------------
  disabled: {
    opacity: 0.45,
  },
});

export default Button;

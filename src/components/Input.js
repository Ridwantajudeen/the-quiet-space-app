// src/components/Input.js
// Themed text input — used in journal, auth, search
//
// Usage:
//   <Input placeholder="Write your thoughts..." multiline />
//   <Input label="Email" value={email} onChangeText={setEmail} />

import React, { useState } from "react";
import { View, TextInput, Text, StyleSheet } from "react-native";
import theme from "../theme";

const { colors, typography, spacing } = theme;

const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  multiline = false,
  numberOfLines = 1,
  secureTextEntry = false,
  style,
  inputStyle,
  ...props
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : 1}
        secureTextEntry={secureTextEntry}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          multiline && styles.multiline,
          focused && styles.focused,
          inputStyle,
        ]}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.presets.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: spacing.base,
    ...typography.presets.body,
    color: colors.textPrimary,
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  focused: {
    borderColor: colors.primaryDark,
    borderWidth: 1.5,
  },
});

export default Input;

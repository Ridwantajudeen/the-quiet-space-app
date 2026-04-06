// src/components/MoodSelector.js
// Visual mood picker — 5-step scale using the mood color ramp
//
// Usage:
//   <MoodSelector value={mood} onChange={setMood} />

import React from "react";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import theme from "../theme";

const { colors, spacing, typography } = theme;

const MOODS = [
  { value: 1, label: "Low" },
  { value: 2, label: "Meh" },
  { value: 3, label: "Okay" },
  { value: 4, label: "Good" },
  { value: 5, label: "Great" },
];

const MoodSelector = ({ value, onChange }) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.barRow}>
        {MOODS.map((mood) => {
          const isSelected = value === mood.value;
          const isPast = value >= mood.value;
          return (
            <TouchableOpacity
              key={mood.value}
              onPress={() => onChange(mood.value)}
              style={styles.barWrapper}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.bar,
                  {
                    backgroundColor: isPast
                      ? colors.mood[mood.value]
                      : colors.primaryLight,
                    transform: [{ scaleY: isSelected ? 1.15 : 1 }],
                  },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.labelRow}>
        {MOODS.map((mood) => (
          <Text
            key={mood.value}
            style={[
              styles.label,
              value === mood.value && styles.labelActive,
            ]}
          >
            {mood.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: spacing.sm,
  },
  barRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: spacing.xs,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
  },
  bar: {
    width: "100%",
    height: 10,
    borderRadius: spacing.radius.full,
  },
  labelRow: {
    flexDirection: "row",
  },
  label: {
    flex: 1,
    textAlign: "center",
    ...typography.presets.caption,
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.textSecondary,
    fontFamily: "DMSans_500Medium",
  },
});

export default MoodSelector;

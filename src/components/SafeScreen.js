import React from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import theme from '../theme';

const { colors, spacing } = theme;

const SafeScreen = ({
  children,
  style,
  contentStyle,
  edges = ['top', 'left', 'right'],
  dismissKeyboard = true,
}) => {
  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      <View
        style={[styles.content, contentStyle]}
        onTouchStart={dismissKeyboard ? Keyboard.dismiss : undefined}
      >
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
  },
});

export default SafeScreen;

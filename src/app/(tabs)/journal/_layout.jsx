import { Stack } from 'expo-router';
import React from 'react';

export default function JournalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    />
  );
}

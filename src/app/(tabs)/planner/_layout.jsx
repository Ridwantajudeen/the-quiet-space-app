import { Stack } from 'expo-router';
import React from 'react';

export default function PlannerLayout() {
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

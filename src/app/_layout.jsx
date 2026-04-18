import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useFonts, DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import 'react-native-reanimated';

import { UserProvider } from '../hooks/useUser';
import { useUser } from '../hooks/useUser';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import {
  clearDailyReminders,
  clearVideoDropFlag,
  notifyDailyVideoIfReady,
  registerPushToken,
  syncDailyReminders,
} from '../services/reminderNotifications';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'quiet-space-react-query',
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSerifDisplay_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const prepareAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
          interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (_) {
        // ignore audio mode errors
      }
    };

    prepareAudio();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24,
      }}
    >
      <UserProvider>
        <>
          <ReminderSync />
          <Stack screenOptions={{ headerShown: false }} initialRouteName="(auth)">
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
          <StatusBar style="auto" />
        </>
      </UserProvider>
    </PersistQueryClientProvider>
  );
}

function ReminderSync() {
  const { user, isReady } = useUser();
  const userId = user?.id;
  const { data: profile } = useProfile(userId);
  const { mutateAsync } = useUpdateProfile(userId);

  useEffect(() => {
    const run = async () => {
      if (!isReady) return;
      if (!userId) {
        await clearDailyReminders();
        await clearVideoDropFlag();
        return;
      }
      if (!profile) return;

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      if (timezone && profile.timezone !== timezone) {
        try {
          await mutateAsync({ timezone });
        } catch (_) {
          // ignore timezone update errors
        }
      }

      await syncDailyReminders({
        userId,
        remindersEnabled: profile.reminders_enabled ?? true,
        reminderTime: profile.reminder_time || null,
        moodReminderEnabled: profile.mood_reminder_enabled ?? true,
        plannerReminderEnabled: profile.planner_reminder_enabled ?? true,
      });

      await registerPushToken({
        authToken: user?.token || null,
      });

      await notifyDailyVideoIfReady({
        userId,
        isPremium: !!user?.isPremium,
        remindersEnabled: profile.reminders_enabled ?? true,
        videoReminderEnabled: profile.video_reminder_enabled ?? true,
        videoDropTime: profile.video_drop_time || null,
        reminderTime: profile.reminder_time || null,
      });
    };

    run();
  }, [
    isReady,
    userId,
    profile?.reminders_enabled,
    profile?.reminder_time,
    profile?.mood_reminder_enabled,
    profile?.planner_reminder_enabled,
    profile?.video_reminder_enabled,
    profile?.timezone,
    user?.isPremium,
  ]);

  return null;
}

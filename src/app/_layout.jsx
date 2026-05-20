import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef } from 'react';
import { useFonts, DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { QueryClient, onlineManager, useQueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import 'react-native-reanimated';

import { UserProvider, useUser } from '../hooks/useUser';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import theme from '../theme';
import {
  clearDailyReminders,
  clearVideoDropFlag,
  notifyDailyVideoIfReady,
  syncDailyReminders,
} from '../services/reminderNotifications';
import { syncOfflineData } from '../services/offlineSync';

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

const { colors } = theme;

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
    onlineManager.setEventListener((setOnline) =>
      NetInfo.addEventListener((state) => {
        setOnline(!!state.isConnected);
      })
    );
  }, []);

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
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
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
          <GlobalOfflineSync />
          <ReminderSync />
          <Stack screenOptions={{ headerShown: false }} initialRouteName="(auth)">
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
          <StatusBar style="dark" backgroundColor={colors.background} />
        </>
      </UserProvider>
    </PersistQueryClientProvider>
  );
}

function GlobalOfflineSync() {
  const { user, isReady } = useUser();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const lastConnectionState = useRef(null);
  const lastAppState = useRef(AppState.currentState);

  useEffect(() => {
    if (!isReady || !userId) return undefined;

    let active = true;

    const runSync = async () => {
      if (!active) return;
      await syncOfflineData({ userId, queryClient });
    };

    runSync().catch(() => {
      // Sync should never block the shell.
    });

    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const isConnected = !!state.isConnected;
      const wasConnected = lastConnectionState.current;
      lastConnectionState.current = isConnected;

      if (isConnected && !wasConnected) {
        runSync().catch(() => {});
      }
    });

    const appSubscription = AppState.addEventListener('change', (nextState) => {
      const wasBackgrounded =
        (lastAppState.current === 'background' || lastAppState.current === 'inactive') &&
        nextState === 'active';
      lastAppState.current = nextState;

      if (wasBackgrounded) {
        NetInfo.fetch()
          .then((state) => {
            if (state.isConnected) {
              runSync().catch(() => {});
            }
          })
          .catch(() => {});
      }
    });

    return () => {
      active = false;
      unsubscribeNetInfo();
      appSubscription.remove();
    };
  }, [isReady, userId, queryClient]);

  return null;
}

function ReminderSync() {
  const { user, isReady } = useUser();
  const userId = user?.id;
  const { data: profile } = useProfile(userId);
  const { mutateAsync } = useUpdateProfile(userId);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!active) return;
      if (!isReady) return;
      if (!userId) {
        await clearDailyReminders();
        await clearVideoDropFlag();
        return;
      }
      if (!profile) return;
      if (!active) return;

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      if (timezone && profile.timezone !== timezone) {
        try {
          await mutateAsync({ timezone });
        } catch (_) {
          // ignore timezone update errors
        }
      }

      if (!active) return;

      await syncDailyReminders({
        userId,
        remindersEnabled: profile.reminders_enabled ?? true,
        reminderTime: profile.reminder_time || null,
        moodReminderEnabled: profile.mood_reminder_enabled ?? true,
        plannerReminderEnabled: profile.planner_reminder_enabled ?? true,
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

    run().catch(() => {
      // Reminder/bootstrap work must never block the app shell.
    });
    return () => {
      active = false;
    };
  }, [
    isReady,
    userId,
    profile,
    mutateAsync,
    user?.token,
    profile?.reminders_enabled,
    profile?.reminder_time,
    profile?.mood_reminder_enabled,
    profile?.planner_reminder_enabled,
    profile?.video_reminder_enabled,
    profile?.timezone,
    user,
    user?.isPremium,
  ]);

  return null;
}

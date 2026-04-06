import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Alert, Platform } from 'react-native';
import { apiRequest } from './api';

const STORAGE_KEY = 'daily_reminder_map_v1';
const VIDEO_NOTIFY_KEY = 'daily_video_notify_v1';
const PUSH_TOKEN_KEY = 'expo_push_token_v1';
const MOOD_WINDOW_DAYS = 30;

const loadState = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { userId: null, time: null, ids: {} };
  try {
    return JSON.parse(raw);
  } catch (_) {
    return { userId: null, time: null, ids: {} };
  }
};

const saveState = async (next) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

const confirmPermission = (message) =>
  new Promise((resolve) => {
    Alert.alert('Before you continue', message, [
      { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Continue', onPress: () => resolve(true) },
    ]);
  });

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeState = (state) => {
  const ids = state?.ids && typeof state.ids === 'object' ? state.ids : {};
  const moodMap =
    ids.moodMap && typeof ids.moodMap === 'object' ? ids.moodMap : {};
  const legacyMoodId = typeof ids.mood === 'string' ? ids.mood : null;
  return {
    userId: state?.userId || null,
    time: state?.time || null,
    ids: {
      planner: ids.planner || null,
      moodMap,
      legacyMoodId,
    },
  };
};

export const ensureReminderNotificationsReady = async () => {
  const current = await Notifications.getPermissionsAsync();
  if (current.status !== 'granted') {
    const allow = await confirmPermission(
      'We use notifications to send gentle reminders for mood check-ins and your planner.'
    );
    if (!allow) return false;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D8A7B1',
    });
  }
  return status === 'granted';
};

const scheduleDaily = async ({ title, body, hour, minute }) => {
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      channelId: 'reminders',
    },
    trigger: {
      type: 'calendar',
      hour,
      minute,
      repeats: true,
    },
  });
};

const cancelById = async (notificationId) => {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (_) {
    // ignore cancel errors
  }
};

const buildMoodDates = (hour, minute) => {
  const now = new Date();
  const dates = [];
  let offset = 0;

  while (dates.length < MOOD_WINDOW_DAYS && offset < MOOD_WINDOW_DAYS + 2) {
    const d = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offset,
      hour,
      minute,
      0,
      0
    );
    if (d > now) {
      dates.push(d);
    }
    offset += 1;
  }

  return dates;
};

const scheduleMoodWindow = async ({ hour, minute }) => {
  const dates = buildMoodDates(hour, minute);
  const entries = {};

  for (const date of dates) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Mood check-in',
        body: 'How are you feeling today? Take a gentle moment to check in.',
        channelId: 'reminders',
      },
      trigger: {
        type: 'date',
        date,
      },
    });
    entries[formatLocalDate(date)] = id;
  }

  return entries;
};

const cancelMoodMap = async (map = {}) => {
  const ids = Object.values(map || {});
  for (const id of ids) {
    await cancelById(id);
  }
};

export const clearDailyReminders = async () => {
  const state = normalizeState(await loadState());
  const ids = state?.ids || {};
  await cancelById(ids.planner);
  if (ids.legacyMoodId) {
    await cancelById(ids.legacyMoodId);
  }
  await cancelMoodMap(ids.moodMap);
  await saveState({ userId: null, time: null, ids: {} });
};

const loadVideoFlag = async () => {
  const raw = await AsyncStorage.getItem(VIDEO_NOTIFY_KEY);
  return raw || null;
};

const saveVideoFlag = async (date) => {
  if (!date) return;
  await AsyncStorage.setItem(VIDEO_NOTIFY_KEY, date);
};

export const clearVideoDropFlag = async () => {
  await AsyncStorage.removeItem(VIDEO_NOTIFY_KEY);
};

const getStoredPushToken = async () => {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
};

const saveStoredPushToken = async (token) => {
  if (!token) return;
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
};

export const registerPushToken = async ({
  authToken,
  remindersEnabled,
  reminderTime,
  videoReminderEnabled,
}) => {
  if (!authToken || !remindersEnabled || !reminderTime || !videoReminderEnabled) return;
  const hasPermission = await ensureReminderNotificationsReady();
  if (!hasPermission) return;

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId;

  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const expoPushToken = tokenResponse?.data;
  if (!expoPushToken) return;

  const storedToken = await getStoredPushToken();
  if (storedToken === expoPushToken) return;

  await apiRequest('/notifications/register', {
    method: 'POST',
    body: {
      expoPushToken,
      platform: Platform.OS,
    },
    token: authToken,
  });

  await saveStoredPushToken(expoPushToken);
};

export const notifyDailyVideoIfReady = async ({
  isPremium,
  remindersEnabled,
  videoReminderEnabled,
}) => {
  if (!remindersEnabled || !videoReminderEnabled) return;
  const storedToken = await getStoredPushToken();
  if (storedToken) return;
  const today = new Date().toISOString().split('T')[0];
  const lastNotified = await loadVideoFlag();
  if (lastNotified === today) return;

  let video = null;
  try {
    video = await apiRequest(`/videos?date=${encodeURIComponent(today)}`);
  } catch (_) {
    return;
  }

  if (!video) return;
  if (video.is_premium && !isPremium) return;

  const hasPermission = await ensureReminderNotificationsReady();
  if (!hasPermission) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daily reset is ready',
      body: 'A new calming video is available when you want it.',
      channelId: 'reminders',
    },
    trigger: { seconds: 1 },
  });

  await saveVideoFlag(today);
};

export const markMoodLoggedToday = async () => {
  const state = normalizeState(await loadState());
  const moodMap = state?.ids?.moodMap || {};
  const today = formatLocalDate(new Date());
  const notificationId = moodMap[today];
  if (!notificationId) return;

  await cancelById(notificationId);
  const nextMap = { ...moodMap };
  delete nextMap[today];
  await saveState({ ...state, ids: { ...state.ids, moodMap: nextMap } });
};

export const syncDailyReminders = async ({
  userId,
  remindersEnabled,
  reminderTime,
  moodReminderEnabled,
  plannerReminderEnabled,
}) => {
  if (!userId) {
    await clearDailyReminders();
    return;
  }

  if (!remindersEnabled || !reminderTime) {
    await clearDailyReminders();
    return;
  }

  const [hourRaw, minuteRaw] = reminderTime.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    await clearDailyReminders();
    return;
  }

  const hasPermission = await ensureReminderNotificationsReady();
  if (!hasPermission) return;

  const state = normalizeState(await loadState());
  const timeChanged = state.time !== reminderTime || state.userId !== userId;
  const nextIds = {
    planner: state?.ids?.planner || null,
    moodMap: state?.ids?.moodMap || {},
  };

  if (state?.ids?.legacyMoodId) {
    await cancelById(state.ids.legacyMoodId);
  }

  const shouldMood = remindersEnabled && moodReminderEnabled;
  const shouldPlanner = remindersEnabled && plannerReminderEnabled;

  if (shouldMood) {
    if (timeChanged || Object.keys(nextIds.moodMap).length === 0) {
      await cancelMoodMap(nextIds.moodMap);
      nextIds.moodMap = await scheduleMoodWindow({ hour, minute });
    }
  } else {
    await cancelMoodMap(nextIds.moodMap);
    nextIds.moodMap = {};
  }

  if (shouldPlanner) {
    if (timeChanged || !nextIds.planner) {
      await cancelById(nextIds.planner);
      nextIds.planner = await scheduleDaily({
        title: 'Planner reminder',
        body: 'Ready to take a look at your day?',
        hour,
        minute,
      });
    }
  } else {
    await cancelById(nextIds.planner);
    nextIds.planner = null;
  }

  await saveState({ userId, time: reminderTime, ids: nextIds });
};

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

const STORAGE_KEY = 'task_notification_map_v1';

const loadMap = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
};

const saveMap = async (next) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

const confirmPermission = (message) =>
  new Promise((resolve) => {
    Alert.alert('Before you continue', message, [
      { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Continue', onPress: () => resolve(true) },
    ]);
  });

export const ensureTaskNotificationsReady = async () => {
  const current = await Notifications.getPermissionsAsync();
  if (current.status !== 'granted') {
    const allow = await confirmPermission(
      'We use notifications to remind you about tasks you schedule.'
    );
    if (!allow) return false;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('tasks', {
      name: 'Tasks',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D8A7B1',
    });
  }
  return status === 'granted';
};

export const scheduleTaskReminder = async ({ taskId, title, remindAt }) => {
  if (!remindAt) return null;
  const triggerAt = new Date(remindAt);
  if (Number.isNaN(triggerAt.getTime())) return null;
  if (triggerAt <= new Date()) return null;

  const hasPermission = await ensureTaskNotificationsReady();
  if (!hasPermission) return null;

  const map = await loadMap();
  if (map[taskId]) return map[taskId];

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Gentle reminder',
      body: title || 'You have a task waiting for you.',
      channelId: 'tasks',
    },
    trigger: {
      type: 'date',
      date: triggerAt,
    },
  });

  await saveMap({ ...map, [taskId]: notificationId });
  return notificationId;
};

export const cancelTaskReminder = async (taskId) => {
  const map = await loadMap();
  const notificationId = map[taskId];
  if (notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (_) {
      // ignore cancel errors
    }
    const next = { ...map };
    delete next[taskId];
    await saveMap(next);
  }
};

export const transferTaskReminder = async (fromId, toId) => {
  const map = await loadMap();
  if (!map[fromId]) return;
  const next = { ...map, [toId]: map[fromId] };
  delete next[fromId];
  await saveMap(next);
};

export const syncTaskRemindersForList = async (tasks = []) => {
  const map = await loadMap();
  const activeIds = new Set(tasks.map((task) => task.id));
  for (const [taskId] of Object.entries(map)) {
    if (!activeIds.has(taskId)) {
      await cancelTaskReminder(taskId);
    }
  }

  for (const task of tasks) {
    if (task.is_done) {
      await cancelTaskReminder(task.id);
      continue;
    }
    if (task.remind_at) {
      await scheduleTaskReminder({
        taskId: task.id,
        title: task.title,
        remindAt: task.remind_at,
      });
    }
  }
};

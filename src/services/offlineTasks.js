import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiRequest } from './api';
import { transferTaskReminder } from './taskNotifications';

const STORAGE_KEY = 'tasks_pending_v1';

const loadQueue = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (_) {
    return [];
  }
};

const saveQueue = async (items) => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const getPendingTasks = async (userId) => {
  const items = await loadQueue();
  return items.filter((item) => item.userId === userId);
};

export const addPendingTask = async (payload) => {
  const items = await loadQueue();
  const entry = {
    id: `local-${Date.now()}`,
    ...payload,
    pending: true,
    createdAt: new Date().toISOString(),
  };
  await saveQueue([entry, ...items]);
  return entry;
};

export const removePendingTask = async (taskId) => {
  const items = await loadQueue();
  const next = items.filter((item) => item.id !== taskId);
  await saveQueue(next);
};

export const syncPendingTasks = async (userId) => {
  const network = await NetInfo.fetch();
  if (!network.isConnected) return { synced: 0 };

  const items = await loadQueue();
  const userItems = items.filter((item) => item.userId === userId);
  let synced = 0;

  for (const item of userItems) {
    try {
      const payload = {
        title: item.title,
        notes: item.notes || '',
        dueDate: item.dueDate,
        dueTime: item.dueTime || null,
        remindAt: item.remindAt || null,
      };
      const result = await apiRequest('/tasks', {
        method: 'POST',
        body: { userId, ...payload },
      });

      if (result?.id) {
        await transferTaskReminder(item.id, result.id);
      }
      synced += 1;
      await removePendingTask(item.id);
    } catch (_) {
      // keep in queue
    }
  }

  return { synced };
};

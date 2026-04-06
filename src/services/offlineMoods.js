import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiRequest } from './api';

const STORAGE_KEY = 'moods_pending_v1';
const CACHE_PREFIX = 'moods_cache_v1_';

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

export const getCachedMoods = async (userId) => {
  if (!userId) return [];
  const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${userId}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (_) {
    return [];
  }
};

export const saveCachedMoods = async (userId, moods) => {
  if (!userId) return;
  try {
    await AsyncStorage.setItem(
      `${CACHE_PREFIX}${userId}`,
      JSON.stringify(Array.isArray(moods) ? moods : [])
    );
  } catch (_) {
    // ignore cache errors
  }
};

export const getPendingMoods = async (userId) => {
  const items = await loadQueue();
  return items.filter((item) => item.userId === userId);
};

export const addPendingMood = async ({ userId, value, note = '', date }) => {
  const items = await loadQueue();
  const todayStr = new Date().toISOString().split('T')[0];
  const entryDate = date || todayStr;
  const entry = {
    id: `local-${Date.now()}`,
    userId,
    value,
    note,
    date: entryDate,
    createdAt: new Date().toISOString(),
    pending: true,
  };

  const filtered = items.filter(
    (item) => !(item.userId === userId && item.date === entryDate)
  );

  await saveQueue([entry, ...filtered]);
  return entry;
};

export const removePendingMood = async (entryId) => {
  const items = await loadQueue();
  const next = items.filter((item) => item.id !== entryId);
  await saveQueue(next);
};

export const syncPendingMoods = async (userId) => {
  const network = await NetInfo.fetch();
  if (!network.isConnected) return { synced: 0 };

  const items = await loadQueue();
  const userItems = items.filter((item) => item.userId === userId);
  let synced = 0;

  for (const item of userItems) {
    try {
      await apiRequest('/moods', {
        method: 'POST',
        body: {
          userId,
          value: item.value,
          note: item.note || '',
          date: item.date,
        },
      });
      synced += 1;
      await removePendingMood(item.id);
    } catch (_) {
      // keep in queue
    }
  }

  return { synced };
};

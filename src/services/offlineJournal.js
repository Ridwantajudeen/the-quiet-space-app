import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import { apiRequest } from './api';
import { authorizedFetch } from './authSession';

const STORAGE_KEY = 'journal_pending_v1';
const UPDATES_KEY = 'journal_updates_v1';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://the-quiet-space-backend.onrender.com';

const deleteLocalVoiceFile = async (uri) => {
  if (!uri) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (_) {
    // ignore file cleanup errors
  }
};

export const uploadVoiceLocalFile = async ({ userId, localUri }) => {
  const filename = `voice_${Date.now()}.m4a`;
  const formData = new FormData();

  formData.append('file', {
    uri: localUri,
    name: filename,
    type: 'audio/m4a',
  });

  if (userId) {
    formData.append('userId', userId);
  }

  const response = await authorizedFetch(`${API_URL}/uploads/voice`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.detail || data?.error || 'Upload failed');
  }

  return data?.url;
};

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

export const getPendingEntries = async (userId) => {
  const items = await loadQueue();
  return items.filter((item) => item.userId === userId);
};

export const addPendingEntry = async ({ userId, text, voiceUrls, voiceLocalUris }) => {
  const items = await loadQueue();
  const now = new Date().toISOString();
  const entry = {
    id: `local-${Date.now()}`,
    userId,
    text,
    voiceUrls: Array.isArray(voiceUrls) ? voiceUrls : [],
    voiceLocalUris: Array.isArray(voiceLocalUris) ? voiceLocalUris : [],
    createdAt: now,
    updatedAt: now,
    pending: true,
  };
  await saveQueue([entry, ...items]);
  return entry;
};

export const removePendingEntry = async (entryId) => {
  const items = await loadQueue();
  const removed = items.find((item) => item.id === entryId);
  const next = items.filter((item) => item.id !== entryId);
  await saveQueue(next);
  if (removed?.voiceLocalUris?.length) {
    for (const uri of removed.voiceLocalUris) {
      await deleteLocalVoiceFile(uri);
    }
  }
};

export const syncPendingEntries = async (userId) => {
  const network = await NetInfo.fetch();
  if (!network.isConnected) return { synced: 0 };

  const items = await loadQueue();
  const userItems = items.filter((item) => item.userId === userId);
  let synced = 0;

  for (const item of userItems) {
    try {
      let voiceUrls = Array.isArray(item.voiceUrls) ? [...item.voiceUrls] : [];
      const localUris = Array.isArray(item.voiceLocalUris) ? item.voiceLocalUris : [];
      for (const uri of localUris) {
        try {
          const uploaded = await uploadVoiceLocalFile({ userId, localUri: uri });
          if (uploaded) voiceUrls.push(uploaded);
        } catch (_) {
          // keep local file for later
        }
      }
      await apiRequest('/journal', {
        method: 'POST',
        body: { userId, text: item.text || '', voiceUrls },
      });
      synced += 1;
      await removePendingEntry(item.id);
    } catch (_) {
      // Keep item in queue; try again later
    }
  }

  return { synced };
};

export const cleanupLocalVoiceFile = deleteLocalVoiceFile;

const loadUpdates = async () => {
  const raw = await AsyncStorage.getItem(UPDATES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (_) {
    return [];
  }
};

const saveUpdates = async (items) => {
  await AsyncStorage.setItem(UPDATES_KEY, JSON.stringify(items));
};

export const getPendingUpdates = async (userId) => {
  const items = await loadUpdates();
  return items.filter((item) => item.userId === userId);
};

export const addPendingUpdate = async ({ entryId, userId, text, voiceUrls, voiceLocalUris }) => {
  const items = await loadUpdates();
  const now = new Date().toISOString();
  const entry = {
    id: entryId,
    userId,
    text,
    voiceUrls: Array.isArray(voiceUrls) ? voiceUrls : [],
    voiceLocalUris: Array.isArray(voiceLocalUris) ? voiceLocalUris : [],
    updatedAt: now,
    pending: true,
  };
  const filtered = items.filter((item) => item.id !== entryId);
  await saveUpdates([entry, ...filtered]);
  return entry;
};

export const updatePendingEntry = async ({ entryId, text, voiceUrls, voiceLocalUris }) => {
  const items = await loadQueue();
  const next = items.map((item) => {
    if (item.id !== entryId) return item;
    return {
      ...item,
      text: text !== undefined ? text : item.text,
      voiceUrls: Array.isArray(voiceUrls) ? voiceUrls : item.voiceUrls,
      voiceLocalUris: Array.isArray(voiceLocalUris) ? voiceLocalUris : item.voiceLocalUris,
      updatedAt: new Date().toISOString(),
    };
  });
  await saveQueue(next);
};

export const syncPendingUpdates = async (userId) => {
  const network = await NetInfo.fetch();
  if (!network.isConnected) return { synced: 0 };

  const items = await loadUpdates();
  const userItems = items.filter((item) => item.userId === userId);
  let synced = 0;

  for (const item of userItems) {
    try {
      let voiceUrls = Array.isArray(item.voiceUrls) ? [...item.voiceUrls] : [];
      const localUris = Array.isArray(item.voiceLocalUris) ? item.voiceLocalUris : [];
      for (const uri of localUris) {
        try {
          const uploaded = await uploadVoiceLocalFile({ userId, localUri: uri });
          if (uploaded) voiceUrls.push(uploaded);
        } catch (_) {
          // keep local
        }
      }

      await apiRequest(`/journal/${item.id}`, {
        method: 'PATCH',
        body: { text: item.text || '', voiceUrls },
      });

      for (const uri of localUris) {
        await deleteLocalVoiceFile(uri);
      }

      const next = items.filter((entry) => entry.id !== item.id);
      await saveUpdates(next);
      synced += 1;
    } catch (_) {
      // keep
    }
  }

  return { synced };
};

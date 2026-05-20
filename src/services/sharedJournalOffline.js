import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiRequest } from './api';
import { uploadVoiceLocalFile, cleanupLocalVoiceFile } from './offlineJournal';

const STORAGE_KEY = 'shared_journal_pending_v1';

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

export const getPendingSharedJournalEntries = async (userId, spaceId = null) => {
  const items = await loadQueue();
  return items.filter((item) => {
    if (item.userId !== userId) return false;
    if (spaceId && item.spaceId !== spaceId) return false;
    return true;
  });
};

export const addPendingSharedJournalEntry = async ({
  userId,
  spaceId,
  text,
  voiceUrls,
  voiceLocalUris,
}) => {
  const items = await loadQueue();
  const now = new Date().toISOString();
  const entry = {
    id: `shared-local-${Date.now()}`,
    userId,
    spaceId,
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

export const removePendingSharedJournalEntry = async (entryId) => {
  const items = await loadQueue();
  const removed = items.find((item) => item.id === entryId);
  const next = items.filter((item) => item.id !== entryId);
  await saveQueue(next);
  if (removed?.voiceLocalUris?.length) {
    for (const uri of removed.voiceLocalUris) {
      await cleanupLocalVoiceFile(uri);
    }
  }
};

export const syncPendingSharedJournalEntries = async (userId) => {
  const network = await NetInfo.fetch();
  if (!network.isConnected) return { synced: 0 };

  const items = await loadQueue();
  const userItems = items.filter((item) => item.userId === userId);
  let synced = 0;

  for (const item of userItems) {
    try {
      let voiceUrls = Array.isArray(item.voiceUrls) ? [...item.voiceUrls] : [];
      const localUris = Array.isArray(item.voiceLocalUris) ? item.voiceLocalUris : [];
      const successfulLocalUris = [];
      const remainingLocalUris = [];

      for (const uri of localUris) {
        try {
          const uploaded = await uploadVoiceLocalFile({ userId, localUri: uri });
          if (uploaded) voiceUrls.push(uploaded);
          successfulLocalUris.push(uri);
        } catch (_) {
          remainingLocalUris.push(uri);
        }
      }

      if (remainingLocalUris.length) {
        for (const uri of successfulLocalUris) {
          await cleanupLocalVoiceFile(uri);
        }
        const next = items.map((entry) => {
          if (entry.id !== item.id) return entry;
          return {
            ...entry,
            voiceUrls,
            voiceLocalUris: remainingLocalUris,
            updatedAt: new Date().toISOString(),
          };
        });
        await saveQueue(next);
        continue;
      }

      await apiRequest('/shared-journal', {
        method: 'POST',
        body: {
          userId,
          spaceId: item.spaceId,
          text: item.text || '',
          voiceUrls,
        },
      });

      for (const uri of successfulLocalUris) {
        await cleanupLocalVoiceFile(uri);
      }

      await removePendingSharedJournalEntry(item.id);
      synced += 1;
    } catch (_) {
      // keep queued
    }
  }

  return { synced };
};

export { uploadVoiceLocalFile, cleanupLocalVoiceFile };

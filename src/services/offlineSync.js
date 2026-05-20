import NetInfo from '@react-native-community/netinfo';

import { syncPendingMoods } from './offlineMoods';
import { syncPendingTasks } from './offlineTasks';
import { syncPendingEntries, syncPendingUpdates } from './offlineJournal';
import { syncPendingSharedJournalEntries } from './sharedJournalOffline';

const inFlightSyncs = new Map();

const runStep = async (label, handler, userId) => {
  try {
    const result = await handler(userId);
    return {
      label,
      synced: result?.synced || 0,
      ok: true,
    };
  } catch (error) {
    return {
      label,
      synced: 0,
      ok: false,
      error,
    };
  }
};

export const syncOfflineData = async ({ userId, queryClient } = {}) => {
  if (!userId) {
    return {
      online: false,
      synced: 0,
      syncedTotal: 0,
      results: [],
    };
  }

  const existing = inFlightSyncs.get(userId);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    const network = await NetInfo.fetch();
    if (!network.isConnected) {
      return {
        online: false,
        synced: 0,
        syncedTotal: 0,
        results: [],
      };
    }

    const results = [];
    results.push(await runStep('moods', syncPendingMoods, userId));
    results.push(await runStep('tasks', syncPendingTasks, userId));
    results.push(await runStep('journalEntries', syncPendingEntries, userId));
    results.push(await runStep('journalUpdates', syncPendingUpdates, userId));
    results.push(
      await runStep('sharedJournalEntries', syncPendingSharedJournalEntries, userId)
    );

    const syncedTotal = results.reduce((total, item) => total + (item.synced || 0), 0);

    if (queryClient?.invalidateQueries) {
      await queryClient.invalidateQueries();
    }

    return {
      online: true,
      synced: syncedTotal,
      syncedTotal,
      results,
    };
  })().finally(() => {
    inFlightSyncs.delete(userId);
  });

  inFlightSyncs.set(userId, promise);
  return promise;
};

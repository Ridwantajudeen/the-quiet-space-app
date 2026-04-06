import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';

import SafeScreen from '../../components/SafeScreen';
import { Heading, Body, Caption, CardTitle } from '../../components/Typography';
import Card from '../../components/Card';
import Button from '../../components/Button';
import VoicePlayer from '../../components/VoicePlayer';
import theme from '../../theme';
import { useJournal, useDeleteJournalEntry } from '../../hooks/useJournal';
import { useUser } from '../../hooks/useUser';
import {
  getPendingEntries,
  getPendingUpdates,
  syncPendingEntries,
  syncPendingUpdates,
  removePendingEntry,
} from '../../services/offlineJournal';

const { colors, spacing } = theme;

const formatDateTime = (value) => {
  if (!value) return '';
  const date = value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTimeValue = (item) => {
  const value = item?.created_at || item?.createdAt;
  if (!value) return 0;
  if (value?.seconds) return value.seconds * 1000;
  return new Date(value).getTime();
};

export default function JournalScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const userId = user?.id;
  const { data = [], isLoading, isError } = useJournal(userId);
  const { mutateAsync: deleteEntry } = useDeleteJournalEntry(userId);
  const [pendingEntries, setPendingEntries] = useState([]);
  const [pendingUpdates, setPendingUpdates] = useState([]);

  const loadPending = async () => {
    if (!userId) return;
    const pending = await getPendingEntries(userId);
    setPendingEntries(pending);
    const updates = await getPendingUpdates(userId);
    setPendingUpdates(updates);
  };

  useEffect(() => {
    loadPending();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (state.isConnected) {
        await syncPendingEntries(userId);
        await syncPendingUpdates(userId);
        await loadPending();
        queryClient.invalidateQueries(['journal', userId]);
      }
    });
    return unsubscribe;
  }, [userId]);

  const combinedEntries = useMemo(() => {
    const pending = pendingEntries.map((entry) => ({
      ...entry,
      created_at: entry.createdAt,
      voice_urls: entry.voiceUrls || [],
      voice_local_uris: entry.voiceLocalUris || [],
      updated_at: entry.updatedAt || entry.createdAt,
      pending: true,
    }));
    const normalized = data.map((entry) => ({
      ...entry,
      voice_urls: Array.isArray(entry.voice_urls)
        ? entry.voice_urls
        : entry.voice_url
        ? [entry.voice_url]
        : [],
      voice_local_uris: [],
    }));
    const all = [...pending, ...normalized];
    const merged = pendingUpdates.length
      ? all.map((entry) => {
          const update = pendingUpdates.find((item) => item.id === entry.id);
          if (!update) return entry;
          return {
            ...entry,
            text: update.text ?? entry.text,
            voice_urls: update.voiceUrls || entry.voice_urls,
            voice_local_uris: update.voiceLocalUris || entry.voice_local_uris,
            updated_at: update.updatedAt || entry.updated_at,
            pendingUpdate: true,
          };
        })
      : all;

    return merged.sort((a, b) => getTimeValue(b) - getTimeValue(a));
  }, [pendingEntries, pendingUpdates, data]);

  const openEntry = (entryId) => {
    router.push({ pathname: '/(tabs)/journal/[id]', params: { id: entryId } });
  };

  const handleDelete = (entry) => {
    Alert.alert(
      'Remove this entry?',
      'This will remove it from your journal. You can always write a new one.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              if (entry.pending) {
                await removePendingEntry(entry.id);
                await loadPending();
              } else {
                await deleteEntry(entry.id);
              }
            } catch (err) {
              console.error('Delete failed:', err);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeScreen contentStyle={styles.screen}>
      <View style={styles.headerRow}>
        <Heading style={styles.title}>Journal</Heading>
        <Button size="sm" onPress={() => router.push('/(tabs)/journal/create')}>
          New entry
        </Button>
      </View>
      <Body muted style={styles.subtitle}>
        Write what you need to release today.
      </Body>

      {isLoading && <Body muted>Loading your entries...</Body>}
      {isError && (
        <Body muted>We could not load your journal right now. Try again soon.</Body>
      )}

      {!isLoading && !combinedEntries.length && (
        <Card style={styles.emptyCard}>
          <CardTitle style={styles.cardTitle}>Your space is ready</CardTitle>
          <Body muted>Start with a few lines about how today feels.</Body>
        </Card>
      )}

      <FlatList
        data={combinedEntries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.entryCard}>
            <View style={styles.metaRow}>
              <Caption style={styles.date}>{formatDateTime(item.created_at)}</Caption>
              {item.pending && <Caption style={styles.pending}>Pending sync</Caption>}
              {!item.pending && item.pendingUpdate && (
                <Caption style={styles.pending}>Pending update</Caption>
              )}
            </View>
            {!!item.text && (
              <TouchableOpacity onPress={() => openEntry(item.id)} activeOpacity={0.7}>
                <Body style={styles.entryText} numberOfLines={3}>
                  {item.text}
                </Body>
                {item.text.length > 160 && (
                  <Caption style={styles.readMore}>Read more</Caption>
                )}
              </TouchableOpacity>
            )}
            {!item.text && (
              <TouchableOpacity onPress={() => openEntry(item.id)} activeOpacity={0.7}>
                <Caption style={styles.readMore}>Open entry</Caption>
              </TouchableOpacity>
            )}
            {((item.voice_urls?.length || 0) + (item.voice_local_uris?.length || 0) > 0) && (
              <Caption style={styles.voiceNote}>
                Voice notes: {(item.voice_urls?.length || 0) + (item.voice_local_uris?.length || 0)}
              </Caption>
            )}
            <View style={styles.actionsRow}>
              <Button
                variant="ghost"
                size="sm"
                textStyle={styles.deleteText}
                onPress={() => handleDelete(item)}
              >
                Delete
              </Button>
            </View>
          </Card>
        )}
      />
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: {
    marginBottom: 0,
  },
  subtitle: {
    marginBottom: spacing.lg,
  },
  list: {
    paddingBottom: spacing.lg,
  },
  entryCard: {
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    marginBottom: spacing.xs,
    color: colors.textMuted,
  },
  pending: {
    color: colors.warning,
  },
  entryText: {
    marginBottom: spacing.sm,
  },
  readMore: {
    color: colors.primaryDark,
    marginBottom: spacing.sm,
  },
  voiceNote: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  voiceRow: {
    marginBottom: spacing.sm,
  },
  actionsRow: {
    alignItems: 'flex-end',
  },
  deleteText: {
    color: colors.error,
  },
  emptyCard: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    marginBottom: spacing.xs,
  },
});

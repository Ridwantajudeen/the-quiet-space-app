import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';

import SafeScreen from '../../components/SafeScreen';
import { Body, Caption, CardTitle, Heading } from '../../components/Typography';
import Card from '../../components/Card';
import Button from '../../components/Button';
import VoicePlayer from '../../components/VoicePlayer';
import theme from '../../theme';
import { useUser } from '../../hooks/useUser';
import { useSharedSpaces } from '../../hooks/useSharedSpaces';
import { useDeleteSharedJournalEntry, useSharedJournal } from '../../hooks/useSharedJournal';
import {
  getPendingSharedJournalEntries,
  removePendingSharedJournalEntry,
} from '../../services/sharedJournalOffline';
import { syncOfflineData } from '../../services/offlineSync';

const { colors, spacing } = theme;

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function SharedJournalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useUser();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data: spaces = [] } = useSharedSpaces(userId);
  const spaceId = typeof params?.spaceId === 'string' ? params.spaceId : null;

  const currentSpace = useMemo(() => {
    if (!spaces.length) return null;
    if (!spaceId) return spaces[0];
    return spaces.find((space) => space.id === spaceId) || spaces[0];
  }, [spaces, spaceId]);

  const { data: entries = [], isLoading, isError } = useSharedJournal({
    spaceId: currentSpace?.id,
    userId,
  });
  const { mutateAsync: deleteEntry } = useDeleteSharedJournalEntry({
    spaceId: currentSpace?.id,
    userId,
  });

  const [pendingEntries, setPendingEntries] = useState([]);

  const loadPending = useCallback(async () => {
    if (!userId || !currentSpace?.id) {
      setPendingEntries([]);
      return;
    }
    const pending = await getPendingSharedJournalEntries(userId, currentSpace.id);
    setPendingEntries(pending);
  }, [userId, currentSpace?.id]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (state.isConnected) {
        await syncOfflineData({ userId, queryClient });
        await loadPending();
      }
    });
    return unsubscribe;
  }, [userId, currentSpace?.id, loadPending, queryClient]);

  const handleDelete = (entry) => {
    Alert.alert(
      'Delete this note?',
      'This removes it from the shared space for everyone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntry(entry.id);
            } catch (_) {
              // ignore
            }
          },
        },
      ]
    );
  };

  const combinedEntries = useMemo(() => {
    const pending = pendingEntries.map((entry) => ({
      ...entry,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt || entry.createdAt,
      voice_urls: entry.voiceUrls || [],
      voice_local_uris: entry.voiceLocalUris || [],
      isMe: true,
      authorName: 'You',
      pending: true,
    }));
    const normalized = entries.map((entry) => ({
      ...entry,
      voice_urls: Array.isArray(entry.voice_urls)
        ? entry.voice_urls
        : entry.voice_urls
        ? [entry.voice_urls]
        : [],
      voice_local_uris: [],
    }));
    return [...pending, ...normalized].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [pendingEntries, entries]);

  return (
    <SafeScreen contentStyle={styles.screen} dismissKeyboard={false}>
      <FlatList
        style={styles.listRoot}
        data={combinedEntries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'android' ? 'on-drag' : 'interactive'}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <View style={styles.headerText}>
                <Heading style={styles.title}>Shared journal</Heading>
                <Caption style={styles.subtitle}>
                  A separate support space for this group.
                </Caption>
              </View>
              <TouchableOpacity
                style={styles.infoButton}
                onPress={() =>
                  currentSpace?.id &&
                  router.push({
                    pathname: '/(tabs)/planner/shared-space-info',
                    params: { spaceId: currentSpace.id },
                  })
                }
              >
                <Ionicons name="information-circle-outline" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Card style={styles.card}>
              <CardTitle>Write a support note</CardTitle>
              <Body muted style={styles.cardBody}>
                Share something the group can hold with you. This stays separate from your personal journal.
              </Body>
              <Button
                onPress={() =>
                  currentSpace?.id &&
                  router.push({
                    pathname: '/(tabs)/planner/shared-journal-create',
                    params: { spaceId: currentSpace.id },
                  })
                }
                disabled={!currentSpace?.id}
              >
                Add journal note
              </Button>
            </Card>

            {isLoading && <Body muted style={styles.helper}>Loading shared notes...</Body>}
            {isError && <Body muted style={styles.helper}>We could not load shared notes right now.</Body>}
            {!isLoading && !isError && !combinedEntries.length && currentSpace ? (
              <Card style={styles.emptyCard}>
                <Body muted>No shared notes yet. Add the first one.</Body>
              </Card>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const canDelete = currentSpace?.role === 'owner' || item.isMe;
          return (
            <Card style={styles.entryCard}>
              <View style={styles.metaRow}>
                <View style={styles.authorRow}>
                  <Caption style={styles.author}>{item.isMe ? 'You' : item.authorName}</Caption>
                  <Caption style={styles.date}>{formatDateTime(item.created_at)}</Caption>
                </View>
                {item.updated_at && item.updated_at !== item.created_at ? (
                  <Caption style={styles.edited}>Edited</Caption>
                ) : null}
              </View>
              {!!item.pending && <Caption style={styles.pending}>Pending sync</Caption>}
              {((item.voice_urls || []).length + (item.voice_local_uris || []).length > 0) && (
                <View style={styles.voiceList}>
                  {item.voice_urls.map((url, index) => (
                    <View key={`${item.id}-${index}`} style={styles.voiceRow}>
                      <VoicePlayer url={url} />
                    </View>
                  ))}
                  {(item.voice_local_uris || []).map((uri, index) => (
                    <View key={`${item.id}-local-${index}`} style={styles.voiceRow}>
                      <VoicePlayer url={uri} />
                    </View>
                  ))}
                </View>
              )}
              {!!item.text ? (
                <Body style={styles.entryText}>{item.text}</Body>
              ) : (
                <Caption style={styles.entryTextMuted}>Voice note</Caption>
              )}
              {canDelete ? (
                <View style={styles.actionsRow}>
                  {item.pending ? (
                    <TouchableOpacity
                      onPress={async () => {
                        await removePendingSharedJournalEntry(item.id);
                        await loadPending();
                      }}
                    >
                      <Caption style={styles.deleteText}>Delete</Caption>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => handleDelete(item)}>
                      <Caption style={styles.deleteText}>Delete</Caption>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}
            </Card>
          );
        }}
      />
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.xl,
  },
  listRoot: {
    flex: 1,
  },
  list: {
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  backButton: {
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  infoButton: {
    paddingLeft: spacing.xs,
    paddingVertical: spacing.xs,
  },
  headerText: {
    flex: 1,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardBody: {
    marginBottom: spacing.sm,
  },
  helper: {
    marginBottom: spacing.md,
  },
  emptyCard: {
    marginBottom: spacing.md,
  },
  entryCard: {
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  authorRow: {
    flex: 1,
  },
  author: {
    color: colors.primaryDark,
    marginBottom: 2,
  },
  date: {
    color: colors.textMuted,
  },
  edited: {
    color: colors.textMuted,
  },
  pending: {
    color: colors.warning,
    marginTop: spacing.xs,
  },
  voiceList: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  voiceRow: {
    marginBottom: spacing.sm,
  },
  entryText: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  entryTextMuted: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    color: colors.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteText: {
    color: colors.error,
  },
});

import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';

import SafeScreen from '../../components/SafeScreen';
import { Body, Caption, Heading } from '../../components/Typography';
import Card from '../../components/Card';
import VoicePlayer from '../../components/VoicePlayer';
import VoiceRecorder from '../../components/VoiceRecorder';
import theme from '../../theme';
import { useUser } from '../../hooks/useUser';
import { useJournal, useUpdateJournalEntry } from '../../hooks/useJournal';
import {
  addPendingUpdate,
  getPendingEntries,
  getPendingUpdates,
  updatePendingEntry,
  uploadVoiceLocalFile,
  cleanupLocalVoiceFile,
} from '../../services/offlineJournal';

const { colors, spacing, typography } = theme;

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

export default function JournalEntryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useUser();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const { data = [] } = useJournal(userId);
  const { mutateAsync: updateEntry, isPending } = useUpdateJournalEntry(userId);
  const [pendingEntries, setPendingEntries] = useState([]);
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [text, setText] = useState('');
  const [voiceClips, setVoiceClips] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [originalSnapshot, setOriginalSnapshot] = useState({
    text: '',
    voiceUrls: [],
    voiceLocalUris: [],
  });

  useEffect(() => {
    const loadPending = async () => {
      if (!userId) return;
      const pending = await getPendingEntries(userId);
      setPendingEntries(pending);
      const updates = await getPendingUpdates(userId);
      setPendingUpdates(updates);
    };
    loadPending();
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
    if (pendingUpdates.length) {
      return all.map((entry) => {
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
      });
    }
    return all;
  }, [pendingEntries, pendingUpdates, data]);

  const entry = useMemo(
    () => combinedEntries.find((item) => String(item.id) === String(id)),
    [combinedEntries, id]
  );

  useEffect(() => {
    if (!entry) return;
    setText(entry.text || '');
    const clips = [];
    if (entry.voice_urls?.length) {
      entry.voice_urls.forEach((url) => clips.push({ url, localUri: null }));
    }
    if (entry.voice_local_uris?.length) {
      entry.voice_local_uris.forEach((localUri) => clips.push({ url: null, localUri }));
    }
    setVoiceClips(clips);
    setIsEditing(false);
    setOriginalSnapshot({
      text: entry.text || '',
      voiceUrls: entry.voice_urls || [],
      voiceLocalUris: entry.voice_local_uris || [],
    });
  }, [entry?.id]);

  const handleSave = async () => {
    if (!userId || !entry) return;

    const voiceUrls = voiceClips.map((clip) => clip.url).filter(Boolean);
    let localUris = voiceClips.map((clip) => clip.localUri).filter(Boolean);

    if (entry.pending) {
      await updatePendingEntry({
        entryId: entry.id,
        text,
        voiceUrls,
        voiceLocalUris: localUris,
      });
      queryClient.invalidateQueries(['journal', userId]);
      return;
    }

    const network = await NetInfo.fetch();
    const isOnline = !!network.isConnected;

    let resolvedVoiceUrls = [...voiceUrls];
    let unresolvedLocalUris = [...localUris];

    if (isOnline && unresolvedLocalUris.length) {
      const uploaded = [];
      const failed = [];
      for (const uri of unresolvedLocalUris) {
        try {
          const url = await uploadVoiceLocalFile({ userId, localUri: uri });
          if (url) uploaded.push(url);
          await cleanupLocalVoiceFile(uri);
        } catch (_) {
          failed.push(uri);
        }
      }
      resolvedVoiceUrls = [...resolvedVoiceUrls, ...uploaded];
      unresolvedLocalUris = failed;
    }

    if (!isOnline || unresolvedLocalUris.length) {
      await addPendingUpdate({
        entryId: entry.id,
        userId,
        text,
        voiceUrls: resolvedVoiceUrls,
        voiceLocalUris: unresolvedLocalUris,
      });
      queryClient.invalidateQueries(['journal', userId]);
      return;
    }

    try {
      await updateEntry({
        entryId: entry.id,
        payload: {
          text,
          voiceUrls: resolvedVoiceUrls,
        },
      });

      queryClient.setQueryData(['journal', userId], (prev = []) =>
        prev.map((item) =>
          item.id === entry.id
            ? { ...item, text, voice_urls: resolvedVoiceUrls, updated_at: new Date().toISOString() }
            : item
        )
      );
    } catch (_) {
      await addPendingUpdate({
        entryId: entry.id,
        userId,
        text,
        voiceUrls: resolvedVoiceUrls,
        voiceLocalUris: unresolvedLocalUris,
      });
      queryClient.invalidateQueries(['journal', userId]);
    }
  };

  if (!entry) {
    return (
      <SafeScreen>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/(tabs)/journal')}
            >
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Heading style={styles.title}>Journal entry</Heading>
          </View>
          <Card>
            <Body muted>We could not find that entry.</Body>
          </Card>
        </ScrollView>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/(tabs)/journal')}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Heading style={styles.title}>Journal entry</Heading>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={async () => {
              if (!isEditing) return;
              const currentUrls = voiceClips.map((clip) => clip.url).filter(Boolean);
              const currentLocals = voiceClips.map((clip) => clip.localUri).filter(Boolean);
              const isChanged =
                text !== originalSnapshot.text ||
                currentUrls.join('|') !== originalSnapshot.voiceUrls.join('|') ||
                currentLocals.join('|') !== originalSnapshot.voiceLocalUris.join('|');
              if (isChanged) {
                await handleSave();
                setOriginalSnapshot({
                  text,
                  voiceUrls: currentUrls,
                  voiceLocalUris: currentLocals,
                });
              }
              setIsEditing(false);
            }}
          >
            <Caption style={[styles.doneText, !isEditing && styles.doneTextMuted]}>
              Done
            </Caption>
          </TouchableOpacity>
        </View>

        <Card style={styles.card}>
          {voiceClips.map((clip, index) => (
            <View key={`${clip.url || clip.localUri}-${index}`} style={styles.voiceRow}>
              <VoicePlayer url={clip.url || clip.localUri} />
            </View>
          ))}

          <VoiceRecorder
            userId={userId}
            onRecordingComplete={({ url, localUri }) => {
              setVoiceClips((prev) => [
                ...prev,
                { url: url || null, localUri: localUri || null },
              ]);
            }}
          />

          {isEditing ? (
            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
              placeholder="Write what's on your mind..."
              placeholderTextColor={colors.textMuted}
            />
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)} activeOpacity={0.7}>
              <Body style={styles.fullText}>
                {text || 'Tap to start writing...'}
              </Body>
            </TouchableOpacity>
          )}

          {entry.pending && <Caption style={styles.pending}>Pending sync</Caption>}
          {!entry.pending && entry.pendingUpdate && (
            <Caption style={styles.pending}>Pending update</Caption>
          )}

          <View style={styles.metaBlock}>
            <Caption style={styles.metaText}>
              Created {formatDateTime(entry.created_at)}
            </Caption>
            <Caption style={styles.metaText}>
              Last edited {formatDateTime(entry.updated_at || entry.created_at)}
            </Caption>
          </View>
        </Card>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  content: {
    paddingBottom: spacing.lg,
  },
  backButton: {
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  title: {
    marginBottom: 0,
    flex: 1,
    textAlign: 'center',
  },
  doneButton: {
    paddingLeft: spacing.xs,
    paddingVertical: spacing.xs,
  },
  doneText: {
    color: colors.primaryDark,
  },
  doneTextMuted: {
    color: colors.textMuted,
  },
  card: {
    marginBottom: spacing.lg,
  },
  textInput: {
    minHeight: 160,
    backgroundColor: colors.surface,
    borderRadius: spacing.radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: spacing.base,
    ...typography.presets.body,
    color: colors.textPrimary,
  },
  fullText: {
    marginBottom: spacing.base,
  },
  voiceRow: {
    marginBottom: spacing.sm,
  },
  pending: {
    color: colors.warning,
  },
  metaBlock: {
    marginTop: spacing.md,
  },
  metaText: {
    color: colors.textMuted,
  },
});

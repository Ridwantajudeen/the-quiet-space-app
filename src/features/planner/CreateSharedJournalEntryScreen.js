import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';

import SafeScreen from '../../components/SafeScreen';
import { Body, Caption, Heading } from '../../components/Typography';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Input from '../../components/Input';
import VoiceRecorder from '../../components/VoiceRecorder';
import VoicePlayer from '../../components/VoicePlayer';
import theme from '../../theme';
import { useUser } from '../../hooks/useUser';
import { useAddSharedJournalEntry } from '../../hooks/useSharedJournal';
import {
  addPendingSharedJournalEntry,
  cleanupLocalVoiceFile,
  uploadVoiceLocalFile,
} from '../../services/sharedJournalOffline';

const { colors, spacing } = theme;

export default function CreateSharedJournalEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const spaceId = typeof params?.spaceId === 'string' ? params.spaceId : '';
  const { user } = useUser();
  const userId = user?.id;
  const { mutateAsync, isPending } = useAddSharedJournalEntry({ spaceId, userId });
  const queryClient = useQueryClient();

  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [voiceClips, setVoiceClips] = useState([]);

  useEffect(() => {
    setText('');
    setError('');
    setVoiceClips([]);
  }, [spaceId]);

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed && !voiceClips.length) {
      setError('Add a few gentle words or a voice note before saving.');
      return;
    }

    const voiceUrls = voiceClips.map((clip) => clip.url).filter(Boolean);
    const voiceLocalUris = voiceClips.map((clip) => clip.localUri).filter(Boolean);

    try {
      const network = await NetInfo.fetch();
      const isOnline = !!network.isConnected;

      let resolvedVoiceUrls = [...voiceUrls];
      let unresolvedLocalUris = [...voiceLocalUris];

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
        await addPendingSharedJournalEntry({
          userId,
          spaceId,
          text: trimmed,
          voiceUrls: resolvedVoiceUrls,
          voiceLocalUris: unresolvedLocalUris,
        });
        queryClient.invalidateQueries(['shared-journal', spaceId, userId]);
        router.replace({
          pathname: '/(tabs)/planner/shared-journal',
          params: { spaceId },
        });
        return;
      }

      await mutateAsync({
        text: trimmed,
        voiceUrls: resolvedVoiceUrls,
      });
      queryClient.invalidateQueries(['shared-journal', spaceId, userId]);
      router.replace({
        pathname: '/(tabs)/planner/shared-journal',
        params: { spaceId },
      });
    } catch (_err) {
      try {
        await addPendingSharedJournalEntry({
          userId,
          spaceId,
          text: trimmed,
          voiceUrls,
          voiceLocalUris,
        });
        queryClient.invalidateQueries(['shared-journal', spaceId, userId]);
        router.replace({
          pathname: '/(tabs)/planner/shared-journal',
          params: { spaceId },
        });
      } catch (fallbackErr) {
        setError(fallbackErr?.message || 'We could not save that note just now.');
      }
    }
  };

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Heading style={styles.title}>New shared note</Heading>
        </View>
        <Body muted style={styles.subtitle}>
          This note will appear only inside the shared space.
        </Body>

        <Card style={styles.card}>
          <Input
            label="Support note"
            placeholder="Write something the group should hold with you..."
            value={text}
            onChangeText={(value) => {
              setText(value);
              if (error) setError('');
            }}
            multiline
            numberOfLines={8}
          />
          {!!error && <Caption style={styles.error}>{error}</Caption>}

          <Body muted style={styles.voiceHint}>
            Optional voice notes can be attached here too.
          </Body>
          <VoiceRecorder
            userId={userId}
            onRecordingComplete={({ url, localUri }) => {
              setVoiceClips((prev) => [...prev, { url: url || null, localUri: localUri || null }]);
            }}
          />
          {voiceClips.map((clip, index) => (
            <View key={`${clip.url || clip.localUri}-${index}`} style={styles.voiceRow}>
              <VoicePlayer url={clip.url || clip.localUri} />
            </View>
          ))}
          {!!voiceClips.length && (
            <Caption style={styles.voiceSaved}>
              {voiceClips.length} voice {voiceClips.length === 1 ? 'note' : 'notes'} attached
            </Caption>
          )}

          <Button onPress={handleSave} loading={isPending} disabled={!userId || !spaceId}>
            Save note
          </Button>
        </Card>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  backButton: {
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  title: {
    marginBottom: 0,
  },
  subtitle: {
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.lg,
  },
  error: {
    color: colors.error,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  voiceHint: {
    marginBottom: spacing.base,
  },
  voiceRow: {
    marginBottom: spacing.sm,
  },
  voiceSaved: {
    textAlign: 'center',
    color: colors.accent,
    marginTop: spacing.xs,
    marginBottom: spacing.base,
  },
});

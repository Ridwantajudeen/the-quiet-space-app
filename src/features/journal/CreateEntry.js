// src/features/journal/CreateEntry.js
// Journal entry screen - text + voice (offline-safe)

import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, KeyboardAvoidingView, Platform, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { Heading, Caption, Body } from '../../components/Typography';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Input from '../../components/Input';
import SafeScreen from '../../components/SafeScreen';
import VoiceRecorder from '../../components/VoiceRecorder';
import VoicePlayer from '../../components/VoicePlayer';
import theme from '../../theme';
import { useAddJournalEntry } from '../../hooks/useJournal';
import { useUser } from '../../hooks/useUser';
import { addPendingEntry, uploadVoiceLocalFile, cleanupLocalVoiceFile } from '../../services/offlineJournal';

const { colors, spacing } = theme;

const CreateEntry = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const userId = user?.id;
  const [text, setText] = useState('');
  const [voiceClips, setVoiceClips] = useState([]);
  const [mode, setMode] = useState('text');

  const { mutateAsync, isPending } = useAddJournalEntry(userId);

  useFocusEffect(
    useCallback(() => {
      setText('');
      setVoiceClips([]);
      setMode('text');
    }, [])
  );

  const handleSave = async () => {
    if (!text.trim() && !voiceClips.length) return;
    if (!userId) return;

    const trimmedText = text.trim();
    const voiceUrls = voiceClips.map((clip) => clip.url).filter(Boolean);
    const voiceLocalUris = voiceClips.map((clip) => clip.localUri).filter(Boolean);

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
      await addPendingEntry({
        userId,
        text: trimmedText,
        voiceUrls: resolvedVoiceUrls,
        voiceLocalUris: unresolvedLocalUris,
      });
      queryClient.invalidateQueries(['journal', userId]);
      setText('');
      setVoiceClips([]);
      setMode('text');
      router.replace('/(tabs)/journal');
      return;
    }

    try {
      await mutateAsync({ text: trimmedText, voiceUrls: resolvedVoiceUrls });
      queryClient.invalidateQueries(['journal', userId]);
      setText('');
      setVoiceClips([]);
      setMode('text');
      router.replace('/(tabs)/journal');
    } catch (_err) {
      // Fallback to offline queue if request fails
      await addPendingEntry({
        userId,
        text: trimmedText,
        voiceUrls: resolvedVoiceUrls,
        voiceLocalUris: unresolvedLocalUris,
      });
      queryClient.invalidateQueries(['journal', userId]);
      setText('');
      setVoiceClips([]);
      setMode('text');
      router.replace('/(tabs)/journal');
    }
  };

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'android' ? 'on-drag' : 'interactive'}
        >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/(tabs)/journal')}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Heading style={styles.title}>New entry</Heading>
        </View>
          <Caption style={styles.date}>
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Caption>

          <View style={styles.toggle}>
            <Button
              variant={mode === 'text' ? 'primary' : 'ghost'}
              size="sm"
              onPress={() => setMode('text')}
            >
              Write
            </Button>
            <Button
              variant={mode === 'voice' ? 'primary' : 'ghost'}
              size="sm"
              onPress={() => setMode('voice')}
            >
              Record
            </Button>
          </View>

          {mode === 'text' && (
            <Card style={styles.card}>
              <Input
                placeholder="What's on your mind today?"
                value={text}
                onChangeText={setText}
                multiline
                numberOfLines={8}
              />
            </Card>
          )}

          {mode === 'voice' && (
            <Card style={styles.card}>
              <Body muted style={styles.voiceHint}>
                Speak freely. Your recording will be saved to your entry.
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
            </Card>
          )}

          <Button
            onPress={handleSave}
            loading={isPending}
            disabled={(!text.trim() && !voiceClips.length) || !userId}
            style={styles.saveBtn}
          >
            Save entry
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  backButton: {
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  date: {
    marginBottom: spacing.lg,
  },
  toggle: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  card: {
    marginBottom: spacing.base,
  },
  voiceHint: {
    marginBottom: spacing.base,
    textAlign: 'center',
  },
  voiceRow: {
    marginBottom: spacing.sm,
  },
  voiceSaved: {
    textAlign: 'center',
    color: colors.accent,
    marginTop: spacing.sm,
  },
  saveBtn: {
    width: '100%',
  },
});

export default CreateEntry;

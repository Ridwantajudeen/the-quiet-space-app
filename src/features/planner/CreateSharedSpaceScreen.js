import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import SafeScreen from '../../components/SafeScreen';
import { Body, Caption, Heading } from '../../components/Typography';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Input from '../../components/Input';
import theme from '../../theme';
import { useUser } from '../../hooks/useUser';
import { useCreateSharedSpace, useInviteSharedMember } from '../../hooks/useSharedSpaces';

const { colors, spacing } = theme;

export default function CreateSharedSpaceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const userId = user?.id;
  const isPremium = !!user?.isPremium;
  const { mutateAsync: createSpace, isPending: creating } = useCreateSharedSpace(userId);
  const { mutateAsync: inviteMember, isPending: inviting } = useInviteSharedMember(userId);

  const [spaceName, setSpaceName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [status, setStatus] = useState('');

  const handleCreate = async () => {
    if (!userId) return;
    if (!isPremium) {
      setStatus('Shared space creation is part of premium.');
      return;
    }
    if (!spaceName.trim()) {
      setStatus('Give your shared space a name.');
      return;
    }

    try {
      const space = await createSpace({ name: spaceName.trim() });
      if (inviteEmail.trim()) {
        await inviteMember({ spaceId: space.id, email: inviteEmail.trim() });
      }
      await queryClient.invalidateQueries(['shared-spaces', userId]);
      router.replace('/(tabs)/planner/shared');
    } catch (err) {
      setStatus(err?.message || 'We could not create the shared space yet.');
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
          <Heading style={styles.title}>Create shared space</Heading>
        </View>
        <Body muted style={styles.subtitle}>
          Keep tasks in one calm place for the people who matter most.
        </Body>

        {!isPremium && (
          <Card style={styles.card}>
            <Body>
              Shared space creation is available to premium members.
            </Body>
            <Caption style={styles.note}>
              Free users can still join up to 2 spaces when invited.
            </Caption>
          </Card>
        )}

        {isPremium && (
          <Card style={styles.card}>
            <Input
              label="Shared space name"
              placeholder="Home support"
              value={spaceName}
              onChangeText={(value) => {
                setSpaceName(value);
                if (status) setStatus('');
              }}
            />
            <Input
              label="Invite email (optional)"
              placeholder="partner@example.com"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {!!status && <Caption style={styles.error}>{status}</Caption>}
            <Button onPress={handleCreate} loading={creating || inviting} disabled={!userId}>
              Create shared space
            </Button>
          </Card>
        )}
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.xl,
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
  note: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  error: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
});

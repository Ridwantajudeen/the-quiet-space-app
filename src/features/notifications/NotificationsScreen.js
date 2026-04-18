import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import SafeScreen from '../../components/SafeScreen';
import { Body, Caption, CardTitle, Heading } from '../../components/Typography';
import Card from '../../components/Card';
import Button from '../../components/Button';
import theme from '../../theme';
import { useUser } from '../../hooks/useUser';
import { useAcceptInvite, useDeclineInvite, useSharedInvites } from '../../hooks/useNotifications';

const { colors, spacing } = theme;

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id;
  const { data: invites = [], isLoading, isError } = useSharedInvites(userId);
  const { mutateAsync: acceptInvite, isPending: accepting } = useAcceptInvite(userId);
  const { mutateAsync: declineInvite, isPending: declining } = useDeclineInvite(userId);

  return (
    <SafeScreen>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Heading style={styles.title}>Notifications</Heading>
      </View>

      <Card style={styles.card}>
        <CardTitle>Shared space invites</CardTitle>
        {isLoading && <Body muted>Loading invites...</Body>}
        {isError && <Body muted>We could not load your invites.</Body>}
        {!isLoading && !isError && invites.length === 0 && (
          <Body muted>No invites yet.</Body>
        )}

        {invites.map((invite) => (
          <View key={invite.id} style={styles.inviteRow}>
            <View style={styles.inviteText}>
              <Body>{invite.spaceName}</Body>
              <Caption>
                Invited by {invite.invitedByName}
              </Caption>
            </View>
            <View style={styles.inviteActions}>
              <Button
                size="sm"
                onPress={() => acceptInvite({ inviteId: invite.id })}
                loading={accepting}
              >
                Accept
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => declineInvite({ inviteId: invite.id })}
                loading={declining}
              >
                Decline
              </Button>
            </View>
          </View>
        ))}
      </Card>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  backButton: {
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  title: {
    marginBottom: 0,
  },
  card: {
    marginBottom: spacing.md,
  },
  inviteRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inviteText: {
    marginBottom: spacing.sm,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

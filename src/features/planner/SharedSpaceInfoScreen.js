import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import SafeScreen from '../../components/SafeScreen';
import { Body, Caption, CardTitle, Heading } from '../../components/Typography';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import theme from '../../theme';
import { useUser } from '../../hooks/useUser';
import { useSharedSpaces, useInviteSharedMember, useSharedSpaceMembers, useRemoveSharedSpaceMember, useLeaveSharedSpace, useDeleteSharedSpace } from '../../hooks/useSharedSpaces';

const { colors, spacing } = theme;

export default function SharedSpaceInfoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useUser();
  const userId = user?.id;
  const spaceId = typeof params?.spaceId === 'string' ? params.spaceId : null;

  const { data: spaces = [] } = useSharedSpaces(userId);
  const currentSpace = useMemo(() => {
    if (!spaces.length) return null;
    if (!spaceId) return spaces[0];
    return spaces.find((space) => space.id === spaceId) || spaces[0];
  }, [spaces, spaceId]);

  const currentRole = currentSpace?.role || null;
  const canManageCurrentSpace = currentRole === 'owner';

  const {
    data: members = [],
    isLoading: membersLoading,
    isError: membersError,
  } = useSharedSpaceMembers({
    spaceId: currentSpace?.id,
    userId,
  });

  const { mutateAsync: inviteMember, isPending: inviting } = useInviteSharedMember(userId);
  const { mutateAsync: removeMember, isPending: removingMember } = useRemoveSharedSpaceMember(userId);
  const { mutateAsync: leaveSpace, isPending: leavingSpace } = useLeaveSharedSpace(userId);
  const { mutateAsync: deleteSpace, isPending: deletingSpace } = useDeleteSharedSpace(userId);

  const [inviteEmail, setInviteEmail] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setInviteEmail('');
    setStatus('');
  }, [currentSpace?.id]);

  const handleInvite = async () => {
    if (!currentSpace?.id) return;
    if (!inviteEmail.trim()) {
      setStatus('Add an email address to invite.');
      return;
    }
    setStatus('');
    try {
      await inviteMember({ spaceId: currentSpace.id, email: inviteEmail.trim() });
      setInviteEmail('');
      setStatus('Invite sent.');
    } catch (err) {
      setStatus(err?.message || 'We could not send that invite yet.');
    }
  };

  const handleRemoveMember = (member) => {
    Alert.alert(
      'Remove member?',
      'This will remove them from the shared space for everyone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember({ spaceId: currentSpace.id, memberId: member.user_id });
            } catch (err) {
              setStatus(err?.message || 'We could not remove that member just now.');
            }
          },
        },
      ]
    );
  };

  const handleLeaveSpace = () => {
    if (!currentSpace?.id) return;
    Alert.alert('Leave shared space?', 'You will no longer see tasks from this space.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveSpace({ spaceId: currentSpace.id });
            router.replace('/(tabs)/planner/shared');
          } catch (err) {
            setStatus(err?.message || 'We could not leave this space just yet.');
          }
        },
      },
    ]);
  };

  const handleDeleteSpace = () => {
    if (!currentSpace?.id) return;
    Alert.alert(
      'Delete shared space?',
      'This removes everyone and all tasks in this shared space.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSpace({ spaceId: currentSpace.id });
              router.replace('/(tabs)/planner/shared');
            } catch (err) {
              setStatus(err?.message || 'We could not delete this space just now.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeScreen>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Heading style={styles.title}>Space info</Heading>
        </View>

        <Card style={styles.card}>
          <CardTitle>{currentSpace?.name || 'Shared space'}</CardTitle>
          <Body muted style={styles.cardBody}>
            Members, invite, and space controls live here.
          </Body>
          {currentRole === 'owner' && (
            <View style={styles.ownerPill}>
              <Ionicons name="checkmark-circle" size={12} color={colors.primaryDark} />
              <Caption style={styles.ownerText}>Owner</Caption>
            </View>
          )}
        </Card>

        <Card style={styles.card}>
          <CardTitle>Invite someone</CardTitle>
          {canManageCurrentSpace ? (
            <>
              <Input
                label="Email"
                placeholder="partner@example.com"
                value={inviteEmail}
                onChangeText={setInviteEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {status ? <Caption style={styles.status}>{status}</Caption> : null}
              <Button onPress={handleInvite} loading={inviting}>
                Send invite
              </Button>
            </>
          ) : (
            <Body muted style={styles.cardBody}>
              Only the space owner can invite new members.
            </Body>
          )}
        </Card>

        <Card style={styles.card}>
          <CardTitle>Members</CardTitle>
          {membersLoading && <Body muted style={styles.memberNote}>Loading members...</Body>}
          {membersError && <Body muted style={styles.memberNote}>We could not load members right now.</Body>}
          {!membersLoading && !membersError && members.length === 0 && (
            <Body muted style={styles.memberNote}>No members yet.</Body>
          )}
          {members.map((member) => (
            <View key={member.id} style={styles.memberRow}>
              <View style={styles.memberText}>
                <Body>
                  {`${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email}
                </Body>
                <Caption style={styles.memberCaption}>
                  {member.role === 'owner' ? 'Owner' : 'Member'}
                  {member.isMe ? ' - You' : ''}
                </Caption>
              </View>
              {canManageCurrentSpace && !member.isMe && (
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => handleRemoveMember(member)}
                  loading={removingMember}
                >
                  Remove
                </Button>
              )}
            </View>
          ))}
        </Card>

        {!canManageCurrentSpace ? (
          <Button variant="outline" onPress={handleLeaveSpace} loading={leavingSpace}>
            Leave space
          </Button>
        ) : (
          <Button variant="outline" onPress={handleDeleteSpace} loading={deletingSpace}>
            Delete space
          </Button>
        )}

        {!!status && <Caption style={styles.status}>{status}</Caption>}
      </View>
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
  cardBody: {
    marginBottom: spacing.sm,
  },
  ownerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.primaryLight,
    alignSelf: 'flex-start',
  },
  ownerText: {
    color: colors.primaryDark,
  },
  memberNote: {
    marginTop: spacing.xs,
    color: colors.textMuted,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  memberText: {
    flex: 1,
  },
  memberCaption: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  status: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});

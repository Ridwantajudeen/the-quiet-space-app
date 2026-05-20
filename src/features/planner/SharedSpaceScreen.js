import React, { useEffect, useMemo, useState } from 'react';
import { Alert, SectionList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import SafeScreen from '../../components/SafeScreen';
import { Body, Caption, CardTitle, Heading } from '../../components/Typography';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import theme from '../../theme';
import { useUser } from '../../hooks/useUser';
import {
  useSharedSpaces,
  useInviteSharedMember,
  useSharedSpaceMembers,
  useRemoveSharedSpaceMember,
  useLeaveSharedSpace,
  useDeleteSharedSpace,
} from '../../hooks/useSharedSpaces';
import { useSharedTasks, useUpdateSharedTask, useDeleteSharedTask } from '../../hooks/useSharedTasks';

const { colors, spacing } = theme;

const formatTime = (value) => {
  if (!value) return '';
  if (typeof value !== 'string') return '';
  return value.length >= 5 ? value.slice(0, 5) : value;
};

const formatDateLabel = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export default function SharedSpaceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useUser();
  const userId = user?.id;
  const isPremium = !!user?.isPremium;

  const { data: spaces = [] } = useSharedSpaces(userId);
  const initialId = typeof params?.spaceId === 'string' ? params.spaceId : null;
  const [selectedSpaceId, setSelectedSpaceId] = useState(initialId);

  const currentSpace = useMemo(() => {
    if (!spaces.length) return null;
    if (selectedSpaceId) {
      const found = spaces.find((space) => space.id === selectedSpaceId);
      return found || spaces[0];
    }
    return spaces[0];
  }, [spaces, selectedSpaceId]);
  useEffect(() => {
    if (!spaces.length) {
      setSelectedSpaceId(null);
      return;
    }
    if (selectedSpaceId && !spaces.some((space) => space.id === selectedSpaceId)) {
      setSelectedSpaceId(spaces[0].id);
    }
  }, [spaces, selectedSpaceId]);
  const currentRole = currentSpace?.role || null;
  const canManageCurrentSpace = currentRole === 'owner';
  const freeSpaceLimitReached = !isPremium && spaces.length >= 2;
  const {
    data: members = [],
    isLoading: membersLoading,
    isError: membersError,
  } = useSharedSpaceMembers({
    spaceId: currentSpace?.id,
    userId,
  });

  const { data: sharedTasks = [], isLoading, isError } = useSharedTasks({
    spaceId: currentSpace?.id,
    userId,
  });
  const { mutateAsync: inviteMember, isPending: inviting } = useInviteSharedMember(userId);
  const { mutateAsync: removeMember, isPending: removingMember } = useRemoveSharedSpaceMember(userId);
  const { mutateAsync: leaveSpace, isPending: leavingSpace } = useLeaveSharedSpace(userId);
  const { mutateAsync: deleteSpace, isPending: deletingSpace } = useDeleteSharedSpace(userId);
  const { mutateAsync: updateTask } = useUpdateSharedTask({
    spaceId: currentSpace?.id,
    userId,
  });
  const { mutateAsync: deleteTask } = useDeleteSharedTask({
    spaceId: currentSpace?.id,
    userId,
  });

  const [inviteEmail, setInviteEmail] = useState('');
  const [status, setStatus] = useState('');

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

  const handleToggle = async (task) => {
    try {
      await updateTask({ taskId: task.id, payload: { isDone: !task.is_done } });
    } catch (_) {
      // ignore
    }
  };

  const handleDelete = (task) => {
    Alert.alert('Remove this task?', 'This will remove it for everyone in the shared space.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask({ taskId: task.id });
          } catch (_) {
            // ignore
          }
        },
      },
    ]);
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
            setStatus('You left the shared space.');
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
              setStatus('Shared space deleted.');
            } catch (err) {
              setStatus(err?.message || 'We could not delete this space just now.');
            }
          },
        },
      ]
    );
  };

  const sections = useMemo(() => {
    const upcoming = sharedTasks.filter((task) => !task.is_done);
    const completed = sharedTasks.filter((task) => task.is_done);
    return [
      { title: 'Upcoming', data: upcoming },
      { title: 'Completed', data: completed },
    ];
  }, [sharedTasks]);

  return (
    <SafeScreen contentStyle={styles.screen} dismissKeyboard={false}>
      <SectionList
        style={styles.listRoot}
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Heading style={styles.title}>Shared space</Heading>
            </View>
            <Body muted style={styles.subtitle}>
              Tasks here show up for everyone you invite.
            </Body>

            <Card style={styles.card}>
              <CardTitle>Shared spaces</CardTitle>
              <Body muted style={styles.cardBody}>
                Keep tasks in one calm place for the people who help you carry them.
              </Body>
              <Button
                style={styles.actionButton}
                onPress={() => router.push('/(tabs)/planner/shared-space-create')}
              >
                Create shared space
              </Button>
              {!isPremium && (
                <Caption style={styles.noticeText}>
                  Creating a space is part of premium. Free users can join up to 2 spaces when invited.
                </Caption>
              )}
              {!isPremium && freeSpaceLimitReached && (
                <Caption style={styles.noticeText}>
                  You have reached your free shared space limit.
                </Caption>
              )}
            </Card>

            {spaces.length > 0 && (
              <View style={styles.spaceTabs}>
                {spaces.map((space) => (
                  <TouchableOpacity
                    key={space.id}
                    style={[
                      styles.spacePill,
                      currentSpace?.id === space.id && styles.spacePillActive,
                    ]}
                    onPress={() => setSelectedSpaceId(space.id)}
                  >
                    <View style={styles.spacePillInner}>
                      <Caption
                        style={
                          currentSpace?.id === space.id
                            ? styles.spacePillTextActive
                            : styles.spacePillText
                        }
                      >
                        {space.name}
                      </Caption>
                      {space.role === 'owner' && (
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color={colors.primaryDark}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {spaces.length > 0 && currentSpace && canManageCurrentSpace && (
              <Card style={styles.card}>
                <CardTitle>Invite someone</CardTitle>
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
                <Button
                  variant="outline"
                  style={styles.actionButton}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/planner/shared-create',
                      params: { spaceId: currentSpace.id },
                    })
                  }
                >
                  Add shared task
                </Button>
              </Card>
            )}

            {spaces.length > 0 && currentSpace && !canManageCurrentSpace && (
              <Card style={styles.card}>
                <Body muted>
                  Only the space owner can invite new members.
                </Body>
                <Button
                  variant="outline"
                  style={styles.actionButton}
                  onPress={handleLeaveSpace}
                  loading={leavingSpace}
                >
                  Leave space
                </Button>
              </Card>
            )}

            {spaces.length > 0 && currentSpace && (
              <Card style={styles.card}>
                <CardTitle>Members</CardTitle>
                {membersLoading && <Body muted style={styles.memberNote}>Loading members...</Body>}
                {membersError && (
                  <Body muted style={styles.memberNote}>We could not load members right now.</Body>
                )}
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
                        {member.isMe ? ' • You' : ''}
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
                {canManageCurrentSpace && (
                  <Button
                    variant="outline"
                    style={styles.actionButton}
                    onPress={handleDeleteSpace}
                    loading={deletingSpace}
                  >
                    Delete space
                  </Button>
                )}
                <Button
                  variant="outline"
                  style={styles.actionButton}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/planner/shared-create',
                      params: { spaceId: currentSpace.id },
                    })
                  }
                >
                  Add shared task
                </Button>
              </Card>
            )}

            {isLoading && <Body muted>Loading shared tasks...</Body>}
            {isError && <Body muted>We could not load shared tasks right now.</Body>}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <CardTitle>{section.title}</CardTitle>
            <Caption>{section.data.length} items</Caption>
          </View>
        )}
        renderItem={({ item }) => (
          <Card style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <View style={styles.titleRow}>
                <TouchableOpacity style={styles.checkButton} onPress={() => handleToggle(item)}>
                  <Ionicons
                    name={item.is_done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={item.is_done ? colors.success : colors.textMuted}
                  />
                </TouchableOpacity>
                <View>
                  <CardTitle style={item.is_done ? styles.taskDone : null}>
                    {item.title}
                  </CardTitle>
                  {!!item.due_date && (
                    <Caption style={styles.dateText}>{formatDateLabel(item.due_date)}</Caption>
                  )}
                </View>
              </View>
            </View>
            {!!item.due_time && <Caption style={styles.time}>{formatTime(item.due_time)}</Caption>}
            {!!item.notes && <Body muted>{item.notes}</Body>}
            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={() => handleDelete(item)}>
                <Caption style={styles.deleteText}>Delete</Caption>
              </TouchableOpacity>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          !isLoading && !isError && spaces.length > 0 ? (
            <Card style={styles.emptyCard}>
              <Body muted>No shared tasks yet. Add one to start.</Body>
            </Card>
          ) : null
        }
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
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  backButton: {
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.lg,
  },
  cardBody: {
    marginBottom: spacing.sm,
  },
  noticeText: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  card: {
    marginBottom: spacing.md,
  },
  status: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  actionButton: {
    marginTop: spacing.sm,
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
  spaceTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  spacePill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.base,
    borderRadius: spacing.radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  spacePillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spacePillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  spacePillText: {
    color: colors.textSecondary,
  },
  spacePillTextActive: {
    color: colors.textPrimary,
  },
  sectionHeader: {
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  taskCard: {
    marginBottom: spacing.md,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  checkButton: {
    paddingRight: spacing.xs,
  },
  taskDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  dateText: {
    color: colors.textMuted,
  },
  time: {
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  deleteText: {
    color: colors.error,
  },
  emptyCard: {
    marginBottom: spacing.md,
  },
});

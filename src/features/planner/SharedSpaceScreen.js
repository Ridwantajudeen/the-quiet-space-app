import React, { useMemo, useState } from 'react';
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
import { useSharedSpaces, useCreateSharedSpace, useInviteSharedMember } from '../../hooks/useSharedSpaces';
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

  const { data: sharedTasks = [], isLoading, isError } = useSharedTasks({
    spaceId: currentSpace?.id,
    userId,
  });
  const { mutateAsync: createSpace, isPending: creating } = useCreateSharedSpace(userId);
  const { mutateAsync: inviteMember, isPending: inviting } = useInviteSharedMember(userId);
  const { mutateAsync: updateTask } = useUpdateSharedTask({
    spaceId: currentSpace?.id,
    userId,
  });
  const { mutateAsync: deleteTask } = useDeleteSharedTask({
    spaceId: currentSpace?.id,
    userId,
  });

  const [spaceName, setSpaceName] = useState('Shared Space');
  const [inviteEmail, setInviteEmail] = useState('');
  const [status, setStatus] = useState('');

  const handleCreateSpace = async () => {
    if (!userId) return;
    setStatus('');
    if (!spaceName.trim()) {
      setStatus('Give your shared space a name.');
      return;
    }
    try {
      const space = await createSpace({ name: spaceName.trim() });
      setSelectedSpaceId(space.id);
      setStatus('Shared space created.');
      if (inviteEmail.trim()) {
        await inviteMember({ spaceId: space.id, email: inviteEmail.trim() });
        setStatus('Shared space created and invite sent.');
      }
    } catch (err) {
      setStatus(err?.message || 'We could not create the shared space yet.');
    }
  };

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

  const sections = useMemo(() => {
    const upcoming = sharedTasks.filter((task) => !task.is_done);
    const completed = sharedTasks.filter((task) => task.is_done);
    return [
      { title: 'Upcoming', data: upcoming },
      { title: 'Completed', data: completed },
    ];
  }, [sharedTasks]);

  return (
    <SafeScreen contentStyle={styles.screen}>
      <SectionList
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
                    <Caption
                      style={
                        currentSpace?.id === space.id
                          ? styles.spacePillTextActive
                          : styles.spacePillText
                      }
                    >
                      {space.name}
                    </Caption>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {spaces.length === 0 && (
              <Card style={styles.card}>
                <CardTitle>Create a shared space</CardTitle>
                <Input
                  label="Shared space name"
                  placeholder="Home support"
                  value={spaceName}
                  onChangeText={setSpaceName}
                />
                <Input
                  label="Invite email (optional)"
                  placeholder="partner@example.com"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                {status ? <Caption style={styles.status}>{status}</Caption> : null}
                <Button onPress={handleCreateSpace} loading={creating}>
                  Create shared space
                </Button>
              </Card>
            )}

            {spaces.length > 0 && currentSpace && (
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

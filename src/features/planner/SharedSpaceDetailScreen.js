import React, { useEffect, useMemo, useState } from 'react';
import { Alert, SectionList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import SafeScreen from '../../components/SafeScreen';
import { Body, Caption, CardTitle, Heading } from '../../components/Typography';
import Card from '../../components/Card';
import Button from '../../components/Button';
import theme from '../../theme';
import { useUser } from '../../hooks/useUser';
import { useSharedSpaceMembers, useSharedSpaces } from '../../hooks/useSharedSpaces';
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

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function SharedSpaceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useUser();
  const userId = user?.id;

  const { data: spaces = [] } = useSharedSpaces(userId);
  const spaceId = typeof params?.spaceId === 'string' ? params.spaceId : null;

  const currentSpace = useMemo(() => {
    if (!spaces.length) return null;
    if (!spaceId) return spaces[0];
    return spaces.find((space) => space.id === spaceId) || spaces[0];
  }, [spaces, spaceId]);

  const { data: sharedTasks = [], isLoading, isError } = useSharedTasks({
    spaceId: currentSpace?.id,
    userId,
  });
  const { data: members = [] } = useSharedSpaceMembers({
    spaceId: currentSpace?.id,
    userId,
  });
  const { mutateAsync: updateTask } = useUpdateSharedTask({
    spaceId: currentSpace?.id,
    userId,
  });
  const { mutateAsync: deleteTask } = useDeleteSharedTask({
    spaceId: currentSpace?.id,
    userId,
  });

  const [selectedSpaceId, setSelectedSpaceId] = useState(spaceId);

  useEffect(() => {
    if (!spaces.length) {
      setSelectedSpaceId(null);
      return;
    }
    if (selectedSpaceId && !spaces.some((space) => space.id === selectedSpaceId)) {
      setSelectedSpaceId(spaces[0].id);
    }
  }, [spaces, selectedSpaceId]);

  const handleToggle = async (task) => {
    try {
      await updateTask({ taskId: task.id, payload: { isDone: !task.is_done } });
    } catch (_) {
      // ignore
    }
  };

  const handleTaskInfo = (task) => {
    const lines = (task.completions || []).length
      ? task.completions
          .map((completion) => {
            const when = formatDateTime(completion.completed_at);
            const label = `${completion.name || 'Someone'}${completion.isMe ? ' (you)' : ''}`;
            return `${label} - ${when}`;
          })
          .join('\n')
      : 'No one has ticked this yet.';

    Alert.alert('Completion history', lines);
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

  const memberNameById = useMemo(() => {
    const map = new Map();
    members.forEach((member) => {
      const label =
        `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email || 'Someone';
      map.set(member.user_id, label);
    });
    return map;
  }, [members]);

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
              <View style={styles.headerText}>
                <Heading style={styles.title}>{currentSpace?.name || 'Shared space'}</Heading>
                <Caption style={styles.subtitle}>Tasks for everyone in this space.</Caption>
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
              <Body muted style={styles.cardBody}>
                Keep shared tasks in one calm place.
              </Body>
              <Button
                style={styles.actionButton}
                onPress={() =>
                  currentSpace?.id &&
                  router.push({
                    pathname: '/(tabs)/planner/shared-create',
                    params: { spaceId: currentSpace.id },
                  })
                }
                disabled={!currentSpace?.id}
              >
                Add shared task
              </Button>
            </Card>

            <Card style={styles.card}>
              <CardTitle>Shared journal</CardTitle>
              <Body muted style={styles.cardBody}>
                A separate support feed for this space. It stays away from your personal journal.
              </Body>
              <Button
                variant="outline"
                onPress={() =>
                  currentSpace?.id &&
                  router.push({
                    pathname: '/(tabs)/planner/shared-journal',
                    params: { spaceId: currentSpace.id },
                  })
                }
                disabled={!currentSpace?.id}
              >
                Open shared journal
              </Button>
            </Card>

            {isLoading && <Body muted style={styles.helper}>Loading shared tasks...</Body>}
            {isError && <Body muted style={styles.helper}>We could not load shared tasks right now.</Body>}
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
                <TouchableOpacity
                  style={styles.checkButton}
                  onPress={() => handleToggle(item)}
                  disabled={!item.can_complete}
                >
                  <Ionicons
                    name={item.is_done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={
                      item.is_done
                        ? colors.success
                        : item.can_complete
                        ? colors.textMuted
                        : colors.border
                    }
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
              <TouchableOpacity style={styles.infoTaskButton} onPress={() => handleTaskInfo(item)}>
                <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {!!item.due_time && <Caption style={styles.time}>{formatTime(item.due_time)}</Caption>}
            <Caption style={styles.assignment}>
              {item.assign_to_all
                ? 'Assigned to: Everyone'
                : `Assigned to: ${item.assignee_name || memberNameById.get(item.assigned_to_user_id) || 'Someone'}`}
            </Caption>
            {!!item.notes && <Body muted>{item.notes}</Body>}
            {(currentSpace?.role === 'owner' || item.created_by === userId) && (
              <View style={styles.actionsRow}>
                <TouchableOpacity onPress={() => handleDelete(item)}>
                  <Caption style={styles.deleteText}>Delete</Caption>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        )}
        ListEmptyComponent={
          !isLoading && !isError && currentSpace ? (
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
  actionButton: {
    marginTop: spacing.sm,
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
  infoTaskButton: {
    paddingLeft: spacing.sm,
    paddingVertical: spacing.xs,
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
  assignment: {
    color: colors.textMuted,
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

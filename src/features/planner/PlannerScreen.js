import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, SectionList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import SafeScreen from '../../components/SafeScreen';
import { Body, Caption, CardTitle, Heading } from '../../components/Typography';
import Card from '../../components/Card';
import theme from '../../theme';
import { useUser } from '../../hooks/useUser';
import { useDeleteTask, useTasks, useUpdateTask } from '../../hooks/useTasks';
import { getPendingTasks, removePendingTask } from '../../services/offlineTasks';
import { syncOfflineData } from '../../services/offlineSync';
import {
  cancelTaskReminder,
  scheduleTaskReminder,
  syncTaskRemindersForList,
} from '../../services/taskNotifications';

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

const todayString = () => new Date().toISOString().split('T')[0];

const weekEndString = () => {
  const end = new Date();
  end.setDate(end.getDate() + 6);
  return end.toISOString().split('T')[0];
};

const diffInDays = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffMs = date.getTime() - today.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

const labelForUpcoming = (dateStr) => {
  if (!dateStr) return 'Someday';
  const diff = diffInDays(dateStr);
  const date = new Date(dateStr);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff !== null && diff >= 2 && diff <= 6) {
    return date.toLocaleDateString('en-GB', { weekday: 'long' });
  }
  return formatDateLabel(dateStr);
};

export default function PlannerScreen() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError } = useTasks(userId);
  const { mutateAsync: updateTask } = useUpdateTask(userId);
  const { mutateAsync: deleteTask } = useDeleteTask(userId);

  const [pendingTasks, setPendingTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [showCompleted, setShowCompleted] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayString());

  const loadPending = useCallback(async () => {
    if (!userId) return;
    const pending = await getPendingTasks(userId);
    setPendingTasks(pending);
  }, [userId]);

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
  }, [userId, loadPending, queryClient]);

  useEffect(() => {
    if (data?.length) {
      syncTaskRemindersForList(data);
    }
  }, [data]);

  const combinedTasks = useMemo(() => {
    const pending = pendingTasks.map((task) => ({
      ...task,
      due_date: task.dueDate,
      due_time: task.dueTime,
      remind_at: task.remindAt,
      is_done: false,
      pending: true,
    }));
    return [...pending, ...data];
  }, [pendingTasks, data]);

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return combinedTasks;
    const today = todayString();
    const weekEnd = weekEndString();
    return combinedTasks.filter((task) => {
      const dueDate = task.due_date || '';
      if (!dueDate) return false;
      if (filter === 'today') return dueDate === today;
      if (filter === 'week') return dueDate >= today && dueDate <= weekEnd;
      return true;
    });
  }, [combinedTasks, filter]);

  const upcomingTasks = useMemo(() => {
    return filteredTasks
      .filter((task) => !task.is_done)
      .sort((a, b) => {
        const dateA = a.due_date || '9999-99-99';
        const dateB = b.due_date || '9999-99-99';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const timeA = a.due_time || '';
        const timeB = b.due_time || '';
        if (timeA !== timeB) return timeA.localeCompare(timeB);
        const createdA = a.created_at || a.createdAt || '';
        const createdB = b.created_at || b.createdAt || '';
        return createdA < createdB ? 1 : -1;
      });
  }, [filteredTasks]);

  const completedTasks = useMemo(() => {
    return filteredTasks
      .filter((task) => task.is_done)
      .sort((a, b) => {
        const createdA = a.created_at || a.createdAt || '';
        const createdB = b.created_at || b.createdAt || '';
        return createdA < createdB ? 1 : -1;
      });
  }, [filteredTasks]);

  const calendarTasks = useMemo(() => {
    return combinedTasks.filter((task) => {
      const dueDate = task.due_date || task.dueDate;
      return dueDate === selectedDate;
    });
  }, [combinedTasks, selectedDate]);

  const calendarSections = useMemo(() => {
    const upcoming = calendarTasks.filter((task) => !task.is_done);
    const completed = calendarTasks.filter((task) => task.is_done);
    return [
      { title: 'Upcoming', data: upcoming },
      { title: 'Completed', data: showCompleted ? completed : [] },
    ];
  }, [calendarTasks, showCompleted]);

  const upcomingSections = useMemo(() => {
    const sectionsList = [];
    let currentLabel = null;
    let currentItems = [];

    for (const task of upcomingTasks) {
      const label = labelForUpcoming(task.due_date || task.dueDate);
      if (label !== currentLabel) {
        if (currentItems.length) {
          sectionsList.push({ title: currentLabel, data: currentItems });
        }
        currentLabel = label;
        currentItems = [task];
      } else {
        currentItems.push(task);
      }
    }

    if (currentItems.length) {
      sectionsList.push({ title: currentLabel, data: currentItems });
    }

    return sectionsList;
  }, [upcomingTasks]);

  const sections = useMemo(() => {
    if (viewMode === 'calendar') return calendarSections;
    const completedSection = showCompleted ? [{ title: 'Completed', data: completedTasks }] : [];
    return [...upcomingSections, ...completedSection];
  }, [calendarSections, upcomingSections, completedTasks, showCompleted, viewMode]);

  const handleToggle = async (task) => {
    if (task.pending) return;
    const nextDone = !task.is_done;
    try {
      await updateTask({ taskId: task.id, payload: { isDone: nextDone } });
      if (nextDone) {
        await cancelTaskReminder(task.id);
      } else if (task.remind_at) {
        await scheduleTaskReminder({
          taskId: task.id,
          title: task.title,
          remindAt: task.remind_at,
          prompt: true,
        });
      }
    } catch (_) {
      // ignore
    }
  };

  const handleDelete = (task) => {
    Alert.alert('Remove this task?', 'You can always add it back later.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            if (task.pending) {
              await removePendingTask(task.id);
              await cancelTaskReminder(task.id);
              await loadPending();
            } else {
              await deleteTask(task.id);
              await cancelTaskReminder(task.id);
            }
          } catch (_) {
            // ignore
          }
        },
      },
    ]);
  };

  const listHeader = (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Heading style={styles.title}>Planner</Heading>
          <Body muted style={styles.subtitle}>
            Keep the small things visible, so they feel lighter.
          </Body>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(tabs)/planner/create')}
        >
          <Ionicons name="add-circle" size={32} color={colors.primaryDark} />
        </TouchableOpacity>
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'list' && styles.toggleActive]}
          onPress={() => setViewMode('list')}
        >
          <Caption style={viewMode === 'list' ? styles.toggleTextActive : styles.toggleText}>
            List
          </Caption>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'calendar' && styles.toggleActive]}
          onPress={() => setViewMode('calendar')}
        >
          <Caption
            style={viewMode === 'calendar' ? styles.toggleTextActive : styles.toggleText}
          >
            Calendar
          </Caption>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {[
          { key: 'all', label: 'All' },
          { key: 'today', label: 'Today' },
          { key: 'week', label: 'This week' },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.filterPill, filter === item.key && styles.filterPillActive]}
            onPress={() => setFilter(item.key)}
          >
            <Caption style={filter === item.key ? styles.filterTextActive : styles.filterText}>
              {item.label}
            </Caption>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.completedToggle}
        onPress={() => setShowCompleted((prev) => !prev)}
      >
        <Caption style={styles.completedToggleText}>
          {showCompleted
            ? `Hide completed (${completedTasks.length})`
            : `Show completed (${completedTasks.length})`}
        </Caption>
      </TouchableOpacity>

      {viewMode === 'calendar' && (
        <Card style={styles.calendarCard}>
          <Calendar
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={{
              [selectedDate]: {
                selected: true,
                selectedColor: colors.primary,
              },
            }}
            theme={{
              calendarBackground: colors.surface,
              todayTextColor: colors.primaryDark,
              dayTextColor: colors.textPrimary,
              monthTextColor: colors.textPrimary,
              textMonthFontFamily: 'DMSerifDisplay_400Regular',
              textDayFontFamily: 'DMSans_400Regular',
              textDayHeaderFontFamily: 'DMSans_500Medium',
              arrowColor: colors.primaryDark,
              selectedDayTextColor: colors.textInverse,
            }}
          />
        </Card>
      )}

      {viewMode === 'list' && (
        <View style={styles.upcomingHeader}>
          <CardTitle>Upcoming</CardTitle>
        </View>
      )}

      {isLoading && <Body muted>Loading your tasks...</Body>}
      {isError && <Body muted>We could not load tasks right now.</Body>}
    </View>
  );

  return (
    <SafeScreen contentStyle={styles.screen} dismissKeyboard={false}>
      <SectionList
        style={styles.listRoot}
        sections={sections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
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
                  disabled={item.pending}
                >
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
              {item.pending && <Caption style={styles.pending}>Pending sync</Caption>}
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
          !isLoading && !isError ? (
            <Card style={styles.emptyCard}>
              <Body muted>No tasks yet. Tap the plus to add one.</Body>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.lg,
  },
  addButton: {
    paddingLeft: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  toggleButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.base,
    borderRadius: spacing.radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  toggleText: {
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.textPrimary,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.base,
    borderRadius: spacing.radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.textPrimary,
  },
  completedToggle: {
    marginBottom: spacing.md,
  },
  completedToggleText: {
    color: colors.textSecondary,
  },
  upcomingHeader: {
    marginBottom: spacing.sm,
  },
  calendarCard: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  list: {
    paddingBottom: spacing.lg,
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
  pending: {
    color: colors.warning,
  },
  emptyCard: {
    marginBottom: spacing.md,
  },
});

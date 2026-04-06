import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';

import SafeScreen from '../../components/SafeScreen';
import { Heading, Body, Caption, CardTitle } from '../../components/Typography';
import Card from '../../components/Card';
import Button from '../../components/Button';
import MoodSelector from '../../components/MoodSelector';
import { useUser } from '../../hooks/useUser';
import { useAddMood } from '../../hooks/useMood';
import { useTasks } from '../../hooks/useTasks';
import { addPendingMood, getCachedMoods, saveCachedMoods } from '../../services/offlineMoods';
import { getPendingTasks } from '../../services/offlineTasks';
import { markMoodLoggedToday } from '../../services/reminderNotifications';
import theme from '../../theme';

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

export default function DashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const firstName = user?.firstName?.trim();
  const userId = user?.id;
  const { mutateAsync, isPending } = useAddMood(userId);
  const { data: tasks = [] } = useTasks(userId);
  const [pendingTasks, setPendingTasks] = useState([]);

  const [todayMood, setTodayMood] = useState(null);
  const [moodError, setMoodError] = useState('');
  const [moodMessage, setMoodMessage] = useState('');

  useEffect(() => {
    let active = true;
    if (!userId) return undefined;
    getPendingTasks(userId).then((items) => {
      if (active) setPendingTasks(items);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const handleSaveMood = async () => {
    setMoodError('');
    setMoodMessage('');
    if (!todayMood) {
      setMoodError('Please choose the mood that feels closest right now.');
      return;
    }
    if (!userId) return;

    const network = await NetInfo.fetch();
    if (!network.isConnected) {
      const entry = await addPendingMood({ userId, value: todayMood, note: '' });
      const cached = await getCachedMoods(userId);
      const filtered = cached.filter((item) => item.date !== entry.date);
      const next = [entry, ...filtered];
      await saveCachedMoods(userId, next);
      queryClient.setQueryData(['moods', userId], (old) => {
        const current = Array.isArray(old) ? old : [];
        const filteredCurrent = current.filter((item) => item.date !== entry.date);
        return [entry, ...filteredCurrent];
      });
      setMoodMessage("Saved offline. We'll sync when you're back online.");
      await markMoodLoggedToday();
      return;
    }

    try {
      await mutateAsync({ value: todayMood, note: '' });
      queryClient.invalidateQueries(['moods', userId]);
      setMoodMessage('Saved. Thank you for checking in.');
      await markMoodLoggedToday();
    } catch (err) {
      setMoodError(err?.message || 'We could not save that mood yet.');
    }
  };

  const combinedTasks = useMemo(() => {
    const pending = pendingTasks.map((task) => ({
      ...task,
      due_date: task.dueDate,
      due_time: task.dueTime,
      is_done: false,
      pending: true,
    }));
    return [...pending, ...tasks];
  }, [pendingTasks, tasks]);

  const upcomingTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return combinedTasks
      .filter((task) => {
        if (task.is_done) return false;
        const dueDate = task.due_date || task.dueDate;
        if (!dueDate) return false;
        return dueDate >= today;
      })
      .sort((a, b) => {
        const dateA = a.due_date || a.dueDate || '9999-99-99';
        const dateB = b.due_date || b.dueDate || '9999-99-99';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const timeA = a.due_time || a.dueTime || '';
        const timeB = b.due_time || b.dueTime || '';
        if (timeA !== timeB) return timeA.localeCompare(timeB);
        return 0;
      })
      .slice(0, 3);
  }, [combinedTasks]);

  return (
    <SafeScreen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Heading style={styles.title}>
          {`Welcome back${firstName ? ` ${firstName}` : ''}`}
        </Heading>
        <Body muted style={styles.subtitle}>
          Take a soft moment for yourself today.
        </Body>

        <Card style={styles.card}>
          <CardTitle style={styles.cardTitle}>Daily reset</CardTitle>
          <Body muted style={styles.caption}>A gentle 2-3 minute video for calm.</Body>
          <Button
            variant="ghost"
            style={styles.cardButton}
            onPress={() => router.push('/(tabs)/video')}
          >
            View today's reset
          </Button>
        </Card>

        <Card style={styles.card}>
          <CardTitle style={styles.cardTitle}>Today's mood</CardTitle>
          <Caption style={styles.caption}>How are you feeling right now?</Caption>
          <MoodSelector value={todayMood} onChange={setTodayMood} />
          {moodError ? <Caption style={styles.error}>{moodError}</Caption> : null}
          {moodMessage ? <Caption style={styles.success}>{moodMessage}</Caption> : null}
          <Button
            style={styles.cardButton}
            onPress={handleSaveMood}
            loading={isPending}
            disabled={!userId}
          >
            Save mood
          </Button>
          <Button
            variant="ghost"
            style={styles.cardButton}
            onPress={() => router.push('/(tabs)/insights')}
          >
            View insights
          </Button>
        </Card>

        <Card style={styles.card}>
          <CardTitle style={styles.cardTitle}>Journal check-in</CardTitle>
          <Body muted style={styles.caption}>Write a few lines or record a short voice note.</Body>
          <Button
            variant="outline"
            style={styles.cardButton}
            onPress={() => router.push('/(tabs)/journal')}
          >
            Start journaling
          </Button>
        </Card>

        <Card style={styles.card}>
          <CardTitle style={styles.cardTitle}>Upcoming tasks</CardTitle>
          {upcomingTasks.length === 0 && (
            <Body muted style={styles.caption}>
              You're clear for now. Add something when you're ready.
            </Body>
          )}
          {upcomingTasks.map((task) => (
            <View key={task.id} style={styles.taskRow}>
              <View style={styles.taskText}>
                <Body>{task.title}</Body>
                {!!task.due_date && (
                  <Caption style={styles.taskMeta}>{labelForUpcoming(task.due_date)}</Caption>
                )}
              </View>
              {!!task.due_time && (
                <Caption style={styles.taskTime}>{formatTime(task.due_time)}</Caption>
              )}
            </View>
          ))}
          <Button
            variant="ghost"
            style={styles.cardButton}
            onPress={() => router.push('/(tabs)/planner')}
          >
            Open planner
          </Button>
        </Card>

        <View style={styles.footer}>
          <Caption style={styles.footerText}>You're doing enough, exactly as you are.</Caption>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
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
  cardTitle: {
    marginBottom: spacing.xs,
  },
  caption: {
    marginBottom: spacing.sm,
    color: colors.textSecondary,
  },
  error: {
    color: colors.error,
    marginBottom: spacing.xs,
  },
  success: {
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  cardButton: {
    marginTop: spacing.sm,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  taskText: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  taskMeta: {
    color: colors.textMuted,
  },
  taskTime: {
    color: colors.primaryDark,
  },
  footer: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  footerText: {
    color: colors.textMuted,
  },
});

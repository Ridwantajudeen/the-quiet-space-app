import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import SafeScreen from '../../components/SafeScreen';
import { Body, Caption, Heading } from '../../components/Typography';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Input from '../../components/Input';
import theme from '../../theme';
import { useUser } from '../../hooks/useUser';
import { useAddTask } from '../../hooks/useTasks';
import { addPendingTask } from '../../services/offlineTasks';
import { scheduleTaskReminder } from '../../services/taskNotifications';

const { colors, spacing } = theme;

const formatDate = (value) => {
  return value.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

const formatTime = (value) => {
  return value.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function CreateTaskScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const userId = user?.id;
  const { mutateAsync, isPending } = useAddTask(userId);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState(new Date());
  const [error, setError] = useState('');

  useEffect(() => {
    setTitle('');
    setNotes('');
    setDate(new Date());
    setTime(null);
    setError('');
    setTempDate(new Date());
    setTempTime(new Date());
  }, []);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Add a short title so it is easy to remember.');
      return;
    }

    const dueDate = date.toISOString().split('T')[0];
    const dueTime = time ? formatTime(time) : null;
    const remindAt = time
      ? new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          time.getHours(),
          time.getMinutes(),
          0
        ).toISOString()
      : null;

    const payload = {
      title: title.trim(),
      notes: notes.trim(),
      dueDate,
      dueTime,
      remindAt,
    };

    const network = await NetInfo.fetch();
    const isOnline = !!network.isConnected;

    if (!isOnline) {
      const pending = await addPendingTask({ userId, ...payload });
      if (remindAt) {
        await scheduleTaskReminder({ taskId: pending.id, title: pending.title, remindAt });
      }
      queryClient.invalidateQueries(['tasks', userId]);
      router.replace('/(tabs)/planner');
      return;
    }

    try {
      const created = await mutateAsync(payload);
      if (created?.id && remindAt) {
        await scheduleTaskReminder({ taskId: created.id, title: created.title, remindAt });
      }
      queryClient.invalidateQueries(['tasks', userId]);
      router.replace('/(tabs)/planner');
    } catch (_) {
      const pending = await addPendingTask({ userId, ...payload });
      if (remindAt) {
        await scheduleTaskReminder({ taskId: pending.id, title: pending.title, remindAt });
      }
      queryClient.invalidateQueries(['tasks', userId]);
      router.replace('/(tabs)/planner');
    }
  };

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/(tabs)/planner')}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Heading style={styles.title}>New task</Heading>
        </View>
        <Body muted style={styles.subtitle}>
          Add one gentle step at a time.
        </Body>

        <Card style={styles.card}>
          <Input
            label="Task title"
            placeholder="Pick up groceries"
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              if (error) setError('');
            }}
          />
          {!!error && <Caption style={styles.error}>{error}</Caption>}
          <Input
            label="Notes (optional)"
            placeholder="Anything to remember?"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Caption>Date</Caption>
              <Button
                variant="outline"
                size="sm"
                onPress={() => {
                  setTempDate(date);
                  setShowDatePicker(true);
                }}
              >
                {formatDate(date)}
              </Button>
            </View>
            <View style={styles.rowItem}>
              <Caption>Time (optional)</Caption>
              <Button
                variant="outline"
                size="sm"
                onPress={() => {
                  setTempTime(time || new Date());
                  setShowTimePicker(true);
                }}
              >
                {time ? formatTime(time) : 'Add time'}
              </Button>
            </View>
          </View>

          <Button onPress={handleSave} loading={isPending} disabled={!userId}>
            Save task
          </Button>
        </Card>
      </KeyboardAvoidingView>

      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(event, selected) => {
            setShowDatePicker(false);
            if (event?.type === 'set' && selected) setDate(selected);
          }}
        />
      )}

      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={time || new Date()}
          mode="time"
          display="default"
          onChange={(event, selected) => {
            setShowTimePicker(false);
            if (event?.type === 'set' && selected) setTime(selected);
          }}
        />
      )}

      {Platform.OS === 'ios' && (
        <>
          <Modal
            transparent
            visible={showDatePicker}
            animationType="fade"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.pickerBackdrop}>
              <View style={styles.pickerCard}>
                <Caption style={styles.pickerTitle}>Select a date</Caption>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  textColor={colors.textPrimary}
                  onChange={(event, selected) => {
                    if (selected) setTempDate(selected);
                  }}
                />
                <Button
                  onPress={() => {
                    setDate(tempDate);
                    setShowDatePicker(false);
                  }}
                >
                  Done
                </Button>
              </View>
            </View>
          </Modal>

          <Modal
            transparent
            visible={showTimePicker}
            animationType="fade"
            onRequestClose={() => setShowTimePicker(false)}
          >
            <View style={styles.pickerBackdrop}>
              <View style={styles.pickerCard}>
                <Caption style={styles.pickerTitle}>Select a time</Caption>
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  display="spinner"
                  textColor={colors.textPrimary}
                  onChange={(event, selected) => {
                    if (selected) setTempTime(selected);
                  }}
                />
                <View style={styles.pickerActions}>
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      setTime(null);
                      setShowTimePicker(false);
                    }}
                  >
                    <Caption style={styles.clearText}>Clear</Caption>
                  </TouchableOpacity>
                  <Button
                    onPress={() => {
                      setTime(tempTime);
                      setShowTimePicker(false);
                    }}
                  >
                    Done
                  </Button>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.base,
  },
  rowItem: {
    flex: 1,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: colors.overlayLight,
    justifyContent: 'flex-end',
  },
  pickerCard: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.lg,
    borderTopLeftRadius: spacing.radius.lg,
    borderTopRightRadius: spacing.radius.lg,
  },
  pickerTitle: {
    marginBottom: spacing.sm,
    color: colors.textSecondary,
  },
  pickerActions: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  clearText: {
    color: colors.textSecondary,
  },
});

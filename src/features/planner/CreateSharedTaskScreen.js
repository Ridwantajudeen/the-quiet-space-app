import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import SafeScreen from '../../components/SafeScreen';
import { Body, Caption, Heading } from '../../components/Typography';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Input from '../../components/Input';
import theme from '../../theme';
import { useUser } from '../../hooks/useUser';
import { useSharedSpaces, useSharedSpaceMembers } from '../../hooks/useSharedSpaces';
import { useAddSharedTask } from '../../hooks/useSharedTasks';

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

export default function CreateSharedTaskScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const spaceId = typeof params?.spaceId === 'string' ? params.spaceId : '';
  const queryClient = useQueryClient();
  const { user } = useUser();
  const userId = user?.id;
  const { data: spaces = [] } = useSharedSpaces(userId);
  const currentSpace = useMemo(() => {
    if (!spaces.length) return null;
    return spaces.find((space) => space.id === spaceId) || spaces[0];
  }, [spaces, spaceId]);
  const { data: members = [] } = useSharedSpaceMembers({
    spaceId: currentSpace?.id,
    userId,
  });
  const { mutateAsync, isPending } = useAddSharedTask({ spaceId: currentSpace?.id, userId });

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState(new Date());
  const [error, setError] = useState('');
  const [assignmentMode, setAssignmentMode] = useState('all');
  const [selectedMemberId, setSelectedMemberId] = useState(null);

  useEffect(() => {
    setTitle('');
    setNotes('');
    setDate(new Date());
    setTime(null);
    setError('');
    setTempDate(new Date());
    setTempTime(new Date());
    setAssignmentMode('all');
    setSelectedMemberId(null);
  }, []);

  useEffect(() => {
    if (!members.length) {
      setSelectedMemberId(null);
      return;
    }
    if (assignmentMode === 'one' && !selectedMemberId) {
      const defaultMember = members.find((member) => member.isMe) || members[0];
      setSelectedMemberId(defaultMember?.user_id || null);
    }
  }, [members, assignmentMode, selectedMemberId]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Add a short title so it is easy to remember.');
      return;
    }

    if (assignmentMode === 'one' && !selectedMemberId) {
      setError('Choose who this task is for, or switch to everyone.');
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
      assignToAll: assignmentMode === 'all',
      assignedToUserId: assignmentMode === 'one' ? selectedMemberId : null,
    };

    try {
      await mutateAsync(payload);
      queryClient.invalidateQueries(['shared-tasks', currentSpace?.id, userId]);
      router.replace({
        pathname: '/(tabs)/planner/shared-space',
        params: { spaceId: currentSpace?.id },
      });
    } catch (err) {
      setError(err?.message || 'We could not save that task yet.');
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
            onPress={() =>
              router.replace({
                pathname: '/(tabs)/planner/shared-space',
                params: { spaceId },
              })
            }
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Heading style={styles.title}>Shared task</Heading>
        </View>
        <Body muted style={styles.subtitle}>
          Everyone in the shared space can see this task, but you can assign it to one person if you want.
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

          <View style={styles.assignmentCard}>
            <Caption style={styles.assignmentLabel}>Assign to</Caption>
            <View style={styles.assignmentRow}>
              <TouchableOpacity
                style={[
                  styles.assignmentPill,
                  assignmentMode === 'all' && styles.assignmentPillActive,
                ]}
                onPress={() => setAssignmentMode('all')}
              >
                <Caption
                  style={[
                    styles.assignmentPillText,
                    assignmentMode === 'all' && styles.assignmentPillTextActive,
                  ]}
                >
                  Everyone
                </Caption>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.assignmentPill,
                  assignmentMode === 'one' && styles.assignmentPillActive,
                ]}
                onPress={() => setAssignmentMode('one')}
              >
                <Caption
                  style={[
                    styles.assignmentPillText,
                    assignmentMode === 'one' && styles.assignmentPillTextActive,
                  ]}
                >
                  One person
                </Caption>
              </TouchableOpacity>
            </View>

            {assignmentMode === 'one' && (
              <View style={styles.memberWrap}>
                {members.map((member) => {
                  const label =
                    `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email;
                  const active = selectedMemberId === member.user_id;
                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={[styles.memberPill, active && styles.memberPillActive]}
                      onPress={() => setSelectedMemberId(member.user_id)}
                    >
                      <Caption style={[styles.memberText, active && styles.memberTextActive]}>
                        {label}
                        {member.isMe ? ' (You)' : ''}
                      </Caption>
                    </TouchableOpacity>
                  );
                })}
                {!members.length && <Caption style={styles.helper}>No members found yet.</Caption>}
              </View>
            )}
          </View>

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

          <Button onPress={handleSave} loading={isPending} disabled={!userId || !spaceId}>
            Save shared task
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
  assignmentCard: {
    marginBottom: spacing.base,
  },
  assignmentLabel: {
    marginBottom: spacing.xs,
    color: colors.textMuted,
  },
  assignmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  assignmentPill: {
    paddingVertical: 8,
    paddingHorizontal: spacing.base,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assignmentPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  assignmentPillText: {
    color: colors.textSecondary,
  },
  assignmentPillTextActive: {
    color: colors.primaryDark,
  },
  memberWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  memberPill: {
    paddingVertical: 8,
    paddingHorizontal: spacing.base,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  memberText: {
    color: colors.textSecondary,
  },
  memberTextActive: {
    color: colors.primaryDark,
  },
  helper: {
    color: colors.textMuted,
    marginTop: spacing.xs,
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

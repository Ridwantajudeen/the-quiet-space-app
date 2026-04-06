import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import SafeScreen from '../../components/SafeScreen';
import { Heading, Body, Caption, CardTitle } from '../../components/Typography';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useUser } from '../../hooks/useUser';
import { useProfile, useUpdateProfile } from '../../hooks/useProfile';
import { SUPPORT_EMAIL, PRIVACY_URL, TERMS_URL } from '../../constants/support';
import { deleteAccount, requestPasswordReset } from './profileService';
import { syncDailyReminders } from '../../services/reminderNotifications';
import theme from '../../theme';

const { colors, spacing } = theme;

export default function SettingsScreen() {
  const router = useRouter();
  const { user, setUser } = useUser();
  const userId = user?.id;
  const { data: profile } = useProfile(userId);
  const { mutateAsync, isPending } = useUpdateProfile(userId);
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [prefMessage, setPrefMessage] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [moodReminderEnabled, setMoodReminderEnabled] = useState(true);
  const [plannerReminderEnabled, setPlannerReminderEnabled] = useState(true);
  const [videoReminderEnabled, setVideoReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const parseTimeString = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(h, 10) || 0, parseInt(m, 10) || 0, 0, 0);
    return date;
  };

  const formatTimeForStorage = (date) => {
    if (!date) return null;
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const timeLabel = useMemo(() => {
    if (!reminderTime) return 'Set a time';
    return reminderTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [reminderTime]);

  useEffect(() => {
    if (!profile) return;
    setRemindersEnabled(profile.reminders_enabled ?? true);
    setMoodReminderEnabled(profile.mood_reminder_enabled ?? true);
    setPlannerReminderEnabled(profile.planner_reminder_enabled ?? true);
    setVideoReminderEnabled(profile.video_reminder_enabled ?? true);
    setReminderTime(parseTimeString(profile.reminder_time));
  }, [profile]);

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          setUser(null);
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete your account?',
      'We will hold your data for 30 days in case you change your mind. After that, it will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: handleDelete,
        },
      ]
    );
  };

  const handleDelete = async () => {
    if (!user?.id) return;
    setDeleting(true);
    setDeleteMessage('');

    try {
      await deleteAccount(user.id);
      setDeleteMessage('Your account is scheduled for deletion. You can log back in within 30 days to cancel.');
      setUser(null);
      router.replace('/(auth)/login');
    } catch (err) {
      setDeleteMessage(err?.message || 'We could not delete the account just yet.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!userId) return;
    setPrefMessage('');
    try {
      const updated = await mutateAsync({
        remindersEnabled,
        moodReminderEnabled,
        plannerReminderEnabled,
        videoReminderEnabled,
        reminderTime: reminderTime ? formatTimeForStorage(reminderTime) : null,
      });

      setUser({
        ...user,
        remindersEnabled: updated.reminders_enabled ?? remindersEnabled,
        reminderTime: updated.reminder_time || formatTimeForStorage(reminderTime),
        moodReminderEnabled: updated.mood_reminder_enabled ?? moodReminderEnabled,
        plannerReminderEnabled: updated.planner_reminder_enabled ?? plannerReminderEnabled,
        videoReminderEnabled: updated.video_reminder_enabled ?? videoReminderEnabled,
      });

      await syncDailyReminders({
        userId,
        remindersEnabled: updated.reminders_enabled ?? remindersEnabled,
        reminderTime: updated.reminder_time || formatTimeForStorage(reminderTime),
        moodReminderEnabled: updated.mood_reminder_enabled ?? moodReminderEnabled,
        plannerReminderEnabled: updated.planner_reminder_enabled ?? plannerReminderEnabled,
      });

      setPrefMessage('Preferences saved.');
    } catch (err) {
      setPrefMessage(err?.message || 'We could not save your preferences yet.');
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setResetMessage('');
    try {
      await requestPasswordReset(user.email);
      setResetMessage('We sent a reset link to your email.');
    } catch (err) {
      setResetMessage(err?.message || 'We could not send the reset email yet.');
    }
  };

  const handleTimeChange = (event, selectedDate) => {
    if (Platform.OS !== 'ios') setShowTimePicker(false);
    if (event?.type === 'dismissed') return;
    if (selectedDate) setReminderTime(selectedDate);
  };

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Heading style={styles.title}>Settings</Heading>
        </View>
        <Body muted style={styles.subtitle}>Keep your account aligned with what you need.</Body>

        <Card style={styles.card}>
          <CardTitle style={styles.cardTitle}>Account</CardTitle>
          <Body muted style={styles.caption}>{user?.email || 'Signed in'}</Body>
          <Button variant="outline" style={styles.cardButton} onPress={handleSignOut}>
            Sign out
          </Button>
          <Button variant="ghost" style={styles.cardButton} onPress={handlePasswordReset}>
            Reset password
          </Button>
          {resetMessage ? <Caption style={styles.prefMessage}>{resetMessage}</Caption> : null}
        </Card>

        <Card style={styles.card}>
          <CardTitle style={styles.cardTitle}>Reminders</CardTitle>
          <Body muted style={styles.caption}>
            Gentle nudges for mood check-ins and your planner.
          </Body>

          <View style={styles.toggleRow}>
            <Body>Enable reminders</Body>
            <Switch
              value={remindersEnabled}
              onValueChange={setRemindersEnabled}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={remindersEnabled ? colors.primaryDark : colors.textMuted}
            />
          </View>

          <View style={[styles.toggleRow, !remindersEnabled && styles.toggleDisabled]}>
            <Body muted={!remindersEnabled}>Mood reminders</Body>
            <Switch
              value={moodReminderEnabled}
              onValueChange={setMoodReminderEnabled}
              disabled={!remindersEnabled}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={moodReminderEnabled ? colors.primaryDark : colors.textMuted}
            />
          </View>

          <View style={[styles.toggleRow, !remindersEnabled && styles.toggleDisabled]}>
            <Body muted={!remindersEnabled}>Planner reminders</Body>
            <Switch
              value={plannerReminderEnabled}
              onValueChange={setPlannerReminderEnabled}
              disabled={!remindersEnabled}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={plannerReminderEnabled ? colors.primaryDark : colors.textMuted}
            />
          </View>

          <View style={[styles.toggleRow, !remindersEnabled && styles.toggleDisabled]}>
            <Body muted={!remindersEnabled}>Daily reset reminders</Body>
            <Switch
              value={videoReminderEnabled}
              onValueChange={setVideoReminderEnabled}
              disabled={!remindersEnabled}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={videoReminderEnabled ? colors.primaryDark : colors.textMuted}
            />
          </View>

          <TouchableOpacity
            style={styles.timeRow}
            onPress={() => setShowTimePicker(true)}
            disabled={!remindersEnabled}
          >
            <Body muted={!remindersEnabled}>Reminder time</Body>
            <Caption style={styles.timeValue}>{timeLabel}</Caption>
          </TouchableOpacity>

          {showTimePicker && (
            <View style={styles.timePickerWrap}>
              <DateTimePicker
                value={reminderTime || new Date()}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
                themeVariant="light"
                textColor={Platform.OS === 'ios' ? colors.textPrimary : undefined}
                style={styles.timePicker}
              />
            </View>
          )}

          <Button
            variant="outline"
            style={styles.cardButton}
            onPress={handleSavePreferences}
            loading={isPending}
          >
            Save preferences
          </Button>
          {prefMessage ? <Caption style={styles.prefMessage}>{prefMessage}</Caption> : null}
        </Card>

        <Card style={styles.card}>
          <CardTitle style={styles.cardTitle}>Help & support</CardTitle>
          <Body muted style={styles.caption}>We are here if you need us.</Body>
          <Button
            variant="ghost"
            style={styles.cardButton}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          >
            Email support
          </Button>
          <Button
            variant="ghost"
            style={styles.cardButton}
            onPress={() => Linking.openURL(PRIVACY_URL)}
          >
            Privacy policy
          </Button>
          <Button
            variant="ghost"
            style={styles.cardButton}
            onPress={() => Linking.openURL(TERMS_URL)}
          >
            Terms of service
          </Button>
        </Card>

        <Card style={styles.card}>
          <CardTitle style={styles.cardTitle}>Privacy & account</CardTitle>
          <Body muted style={styles.caption}>
            If you need to step away, you can delete your account. We&apos;ll keep it recoverable for 30 days.
          </Body>
          <Button
            variant="ghost"
            style={styles.deleteButton}
            onPress={confirmDelete}
            loading={deleting}
          >
            Delete account
          </Button>
          {deleteMessage ? <Caption style={styles.deleteMessage}>{deleteMessage}</Caption> : null}
        </Card>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
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
    marginBottom: spacing.md,
  },
  cardTitle: {
    marginBottom: spacing.xs,
  },
  caption: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  cardButton: {
    marginTop: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  toggleDisabled: {
    opacity: 0.5,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  timeValue: {
    color: colors.textPrimary,
    backgroundColor: colors.surfaceDark,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: spacing.radius.full,
  },
  timePickerWrap: {
    marginTop: spacing.sm,
    borderRadius: spacing.radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  timePicker: {
    backgroundColor: colors.surface,
  },
  prefMessage: {
    marginTop: spacing.sm,
    color: colors.textMuted,
  },
  deleteButton: {
    marginTop: spacing.xs,
  },
  deleteMessage: {
    marginTop: spacing.sm,
    color: colors.textMuted,
  },
});

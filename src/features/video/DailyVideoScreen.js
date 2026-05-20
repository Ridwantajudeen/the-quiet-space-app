import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Audio, Video } from "expo-av";

import SafeScreen from "../../components/SafeScreen";
import { Heading, Body, Caption, CardTitle } from "../../components/Typography";
import Card from "../../components/Card";
import Button from "../../components/Button";
import { useDailyVideo } from "../../hooks/useVideo";
import { useUser } from "../../hooks/useUser";
import { useProfile, useUpdateProfile } from "../../hooks/useProfile";
import theme from "../../theme";

const { colors, spacing } = theme;

const formatLongDate = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

export default function DailyVideoScreen() {
  const router = useRouter();
  const { user } = useUser();
  const isPremium = !!user?.isPremium;
  const userId = user?.id;
  const today = new Date().toISOString().split("T")[0];
  const { data: video, isLoading, isError } = useDailyVideo(userId);
  const playerRef = useRef(null);
  const { data: profile } = useProfile(userId);
  const { mutateAsync, isPending: isSaving } = useUpdateProfile(userId);

  const [videoReminderEnabled, setVideoReminderEnabled] = useState(true);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [reminderMessage, setReminderMessage] = useState("");

  const isLocked = useMemo(() => {
    if (!video) return false;
    return video.is_premium && !isPremium;
  }, [video, isPremium]);

  useEffect(() => {
    const enableAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (_) {
        // ignore audio mode errors
      }
    };

    enableAudio();
  }, []);

  useEffect(() => {
    if (!profile) return;
    setVideoReminderEnabled(profile.video_reminder_enabled ?? true);
    setRemindersEnabled(profile.reminders_enabled ?? true);
  }, [profile]);

  const handleToggleVideoReminder = async (next) => {
    if (!userId) return;
    setReminderMessage("");
    setVideoReminderEnabled(next);
    try {
      await mutateAsync({ videoReminderEnabled: next });
      setReminderMessage(next ? "Daily reset reminders are on." : "Daily reset reminders are off.");
    } catch (err) {
      setVideoReminderEnabled((prev) => !prev);
      setReminderMessage(err?.message || "We couldn't update that yet.");
    }
  };

  const displayDate = video?.date || today;

  return (
    <SafeScreen>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Heading style={styles.title}>Daily reset</Heading>
      </View>
      <Caption style={styles.date}>{formatLongDate(displayDate)}</Caption>

      <Card style={styles.card}>
        <CardTitle style={styles.cardTitle}>Latest reset</CardTitle>
        {isLoading && <Body muted>Loading your reset...</Body>}
        {isError && !isLoading && <Body muted>We could not load today&apos;s reset.</Body>}
        {!isLoading && !isError && !video && (
          <Body muted>No reset video yet. Check back later today.</Body>
        )}
        {!isLoading && !isError && video && isLocked && (
          <View>
            <Body muted>This reset is part of Calm Plus.</Body>
            <Button variant="outline" style={styles.lockButton} onPress={() => router.push('/premium')}>
              Upgrade to Premium
            </Button>
          </View>
        )}
        {!isLoading && !isError && video && !isLocked && (
          <View style={styles.playerWrap}>
            <Video
              ref={playerRef}
              source={{ uri: video.url }}
              style={styles.player}
              resizeMode="contain"
              useNativeControls
              shouldPlay={false}
              isLooping={false}
              isMuted={false}
              volume={1.0}
              onLoad={() => {
                if (playerRef.current?.setStatusAsync) {
                  playerRef.current.setStatusAsync({ isMuted: false, volume: 1.0 });
                }
              }}
            />
            {video.title ? <Caption style={styles.videoTitle}>{video.title}</Caption> : null}
          </View>
        )}
      </Card>

      <Card style={styles.card}>
        <View style={styles.reminderRow}>
          <View style={styles.reminderText}>
            <CardTitle>Daily reset reminders</CardTitle>
            <Caption style={styles.reminderCaption}>
              Get a gentle nudge when a new reset video is ready.
            </Caption>
          </View>
          <Switch
            value={videoReminderEnabled}
            onValueChange={handleToggleVideoReminder}
            disabled={!remindersEnabled || isSaving}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={videoReminderEnabled ? colors.primaryDark : colors.textMuted}
          />
        </View>
        {!remindersEnabled && (
          <Caption style={styles.reminderHint}>
            Turn on reminders in Settings to use daily reset alerts.
          </Caption>
        )}
        {!!reminderMessage && <Caption style={styles.reminderHint}>{reminderMessage}</Caption>}
      </Card>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
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
  date: {
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    marginBottom: spacing.sm,
  },
  lockButton: {
    marginTop: spacing.sm,
  },
  playerWrap: {
    marginTop: spacing.sm,
  },
  player: {
    width: "100%",
    height: 220,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.surfaceDark,
  },
  videoTitle: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.base,
  },
  reminderText: {
    flex: 1,
  },
  reminderCaption: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  reminderHint: {
    marginTop: spacing.sm,
    color: colors.textMuted,
  },
});

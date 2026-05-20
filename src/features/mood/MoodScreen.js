import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import Button from "../../components/Button";
import Card from "../../components/Card";
import Input from "../../components/Input";
import MoodSelector from "../../components/MoodSelector";
import SafeScreen from "../../components/SafeScreen";
import { Body, Caption, Heading, CardTitle } from "../../components/Typography";
import { useMood, useAddMood } from "../../hooks/useMood";
import { useUser } from "../../hooks/useUser";
import {
  addPendingMood,
  getCachedMoods,
  getPendingMoods,
  saveCachedMoods,
} from "../../services/offlineMoods";
import { syncOfflineData } from "../../services/offlineSync";
import { markMoodLoggedToday } from "../../services/reminderNotifications";
import theme from "../../theme";

const { colors, spacing } = theme;

const MOOD_LABELS = {
  1: "Low",
  2: "Meh",
  3: "Okay",
  4: "Good",
  5: "Great",
};

const formatDateLabel = (dateStr) => {
  if (!dateStr) return "";
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  if (dateStr === todayStr) return "Today";

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  if (dateStr === yesterdayStr) return "Yesterday";

  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export default function MoodScreen() {
  const { user } = useUser();
  const userId = user?.id;
  const router = useRouter();
  const { data: moods = [], isLoading, isError } = useMood(userId);
  const addMood = useAddMood(userId);
  const queryClient = useQueryClient();

  const [pendingMoods, setPendingMoods] = useState([]);
  const [cachedMoods, setCachedMoods] = useState([]);
  const [cacheReady, setCacheReady] = useState(false);

  const hasInit = useRef(false);
  const [value, setValue] = useState(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    let active = true;
    if (!userId) return undefined;

    getCachedMoods(userId).then((items) => {
      if (active) {
        setCachedMoods(items);
        setCacheReady(true);
      }
    });

    getPendingMoods(userId).then((items) => {
      if (active) {
        setPendingMoods(items);
      }
    });

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    if (!moods || moods.length === 0) return;
    saveCachedMoods(userId, moods);
    setCachedMoods(moods);
  }, [moods, userId]);

  useEffect(() => {
    if (!userId) return undefined;
    let isActive = true;

    const runSync = async () => {
      const result = await syncOfflineData({ userId, queryClient });
      if (result?.synced && isActive) {
        queryClient.invalidateQueries(["moods", userId]);
        const items = await getPendingMoods(userId);
        if (isActive) setPendingMoods(items);
      }
    };

    runSync();
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        runSync();
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [userId, queryClient]);

  const mergedMoods = useMemo(() => {
    const baseMoods =
      moods.length > 0 || !cacheReady ? moods : cachedMoods;
    const pendingByDate = new Map(
      pendingMoods.map((item) => [item.date, item])
    );
    const combined = [
      ...pendingMoods,
      ...baseMoods.filter((item) => !pendingByDate.has(item.date)),
    ];

    return combined.sort((a, b) => {
      const aDate = a.date || "";
      const bDate = b.date || "";
      return bDate.localeCompare(aDate);
    });
  }, [moods, pendingMoods, cacheReady, cachedMoods]);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayEntry = useMemo(
    () => mergedMoods.find((item) => item.date === todayStr),
    [mergedMoods, todayStr]
  );

  useEffect(() => {
    if (hasInit.current) return;
    if (isLoading || !cacheReady) return;
    if (todayEntry) {
      setValue(todayEntry.value);
      setNote(todayEntry.note || "");
    }
    hasInit.current = true;
  }, [todayEntry, isLoading, cacheReady]);

  const handleSave = async () => {
    setError("");
    setSavedMessage("");
    if (!value) {
      setError("Please choose the mood that feels closest right now.");
      return;
    }

    try {
      const network = await NetInfo.fetch();
      if (!network.isConnected) {
        const entry = await addPendingMood({
          userId,
          value,
          note: note.trim(),
        });
        setPendingMoods((prev) => [
          entry,
          ...prev.filter((item) => item.date !== entry.date),
        ]);
        setCachedMoods((prev) => {
          const filtered = prev.filter((item) => item.date !== entry.date);
          const next = [entry, ...filtered];
          saveCachedMoods(userId, next);
          return next;
        });
        queryClient.setQueryData(["moods", userId], (old) => {
          const current = Array.isArray(old) ? old : [];
          const filtered = current.filter((item) => item.date !== entry.date);
          return [entry, ...filtered];
        });
        setSavedMessage("Saved offline. We'll sync when you're back online.");
        await markMoodLoggedToday();
        return;
      }

      await addMood.mutateAsync({ value, note: note.trim() });
      setSavedMessage("Saved. Thank you for checking in.");
      await markMoodLoggedToday();
    } catch (err) {
      setError(err?.message || "We could not save that mood yet.");
    }
  };

  const recent = mergedMoods.slice(0, 7);

  return (
    <SafeScreen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Heading style={styles.title}>Mood check-in</Heading>
        <Body muted style={styles.subTitle}>
          How are you feeling today?
        </Body>

        <Card style={styles.card}>
          <CardTitle style={styles.cardTitle}>Today&apos;s mood</CardTitle>
          <MoodSelector value={value} onChange={setValue} />
          {value ? (
            <Caption style={styles.moodLabel}>
              {MOOD_LABELS[value]}
            </Caption>
          ) : null}

          <Input
            label="Optional note"
            placeholder="Anything you want to remember?"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
          />

          {error ? <Caption style={styles.error}>{error}</Caption> : null}
          {savedMessage ? (
            <Caption style={styles.success}>{savedMessage}</Caption>
          ) : null}

          <Button
            onPress={handleSave}
            loading={addMood.isPending || addMood.isLoading}
            disabled={!userId}
            style={styles.saveBtn}
          >
            Save mood
          </Button>
          <Button
            variant="ghost"
            style={styles.secondaryBtn}
            onPress={() => router.push("/(tabs)/insights")}
          >
            View insights
          </Button>
        </Card>

        <Card style={styles.card}>
          <CardTitle style={styles.cardTitle}>Recent check-ins</CardTitle>
          {isLoading && <Body muted>Loading your moods...</Body>}
          {isError && !isLoading && (
            <Body muted>We could not load your moods right now.</Body>
          )}
          {!isLoading && !isError && recent.length === 0 && (
            <Body muted>No check-ins yet. Your first one will show up here.</Body>
          )}
          {!isLoading &&
            !isError &&
            recent.map((item) => (
              <View key={item.id} style={styles.row}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: colors.mood[item.value] || colors.primary },
                  ]}
                />
                <View style={styles.rowBody}>
                  <Body>{MOOD_LABELS[item.value] || "Mood"}</Body>
                  {item.note ? <Caption>{item.note}</Caption> : null}
                  {item.pending ? (
                    <Caption style={styles.pending}>Pending sync</Caption>
                  ) : null}
                </View>
                <Caption style={styles.rowDate}>
                  {formatDateLabel(item.date)}
                </Caption>
              </View>
            ))}
        </Card>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
  },
  title: {
    marginTop: spacing.xs,
  },
  subTitle: {
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    marginBottom: spacing.sm,
  },
  moodLabel: {
    marginTop: spacing.xs,
    marginBottom: spacing.base,
    color: colors.textSecondary,
    textAlign: "center",
  },
  error: {
    color: colors.error,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  success: {
    color: colors.accent,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  saveBtn: {
    width: "100%",
    marginTop: spacing.sm,
  },
  secondaryBtn: {
    width: "100%",
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: spacing.radius.full,
    marginTop: 4,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowDate: {
    color: colors.textMuted,
  },
  pending: {
    color: colors.warning,
  },
});

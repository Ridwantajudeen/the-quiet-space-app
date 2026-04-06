// src/features/insights/InsightsScreen.js
// Basic mood trends - last 7 days bar chart + summary
//
// Shows:
//   - 7-day mood bar chart
//   - Average mood
//   - Most common mood label
//   - Streak count

import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useMood } from "../../hooks/useMood";
import { useUser } from "../../hooks/useUser";
import {
  getCachedMoods,
  getPendingMoods,
  saveCachedMoods,
  syncPendingMoods,
} from "../../services/offlineMoods";
import SafeScreen from "../../components/SafeScreen";
import { Heading, Body, BodySmall, Caption, CardTitle } from "../../components/Typography";
import Card from "../../components/Card";
import theme from "../../theme";

const { colors, spacing } = theme;

const MOOD_LABELS = { 1: "Low", 2: "Meh", 3: "Okay", 4: "Good", 5: "Great" };

const InsightsScreen = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const userId = user?.id;
  const { data: moods = [], isLoading, isError } = useMood(userId);

  const [pendingMoods, setPendingMoods] = useState([]);
  const [cachedMoods, setCachedMoods] = useState([]);
  const [cacheReady, setCacheReady] = useState(false);
  const [pendingReady, setPendingReady] = useState(false);

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
        setPendingReady(true);
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
    let active = true;

    const runSync = async () => {
      const result = await syncPendingMoods(userId);
      if (result?.synced && active) {
        queryClient.invalidateQueries(["moods", userId]);
        const items = await getPendingMoods(userId);
        if (active) setPendingMoods(items);
      }
    };

    runSync();
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) runSync();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [userId, queryClient]);

  const mergedMoods = useMemo(() => {
    const baseMoods = moods.length > 0 || !cacheReady ? moods : cachedMoods;
    const pendingByDate = new Map(pendingMoods.map((item) => [item.date, item]));
    const combined = [
      ...pendingMoods,
      ...baseMoods.filter((item) => !pendingByDate.has(item.date)),
    ];

    return combined.sort((a, b) => {
      const aDate = a.date || "";
      const bDate = b.date || "";
      return bDate.localeCompare(aDate);
    });
  }, [moods, cachedMoods, pendingMoods, cacheReady]);

  const last7 = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const entry = mergedMoods.find((m) => m.date === dateStr);
      days.push({
        date: dateStr,
        value: entry?.value || 0,
        label: d.toLocaleDateString("en-GB", { weekday: "short" }),
      });
    }
    return days;
  }, [mergedMoods]);

  const avgMood = useMemo(() => {
    const filled = last7.filter((d) => d.value > 0);
    if (!filled.length) return 0;
    return Math.round(filled.reduce((sum, d) => sum + d.value, 0) / filled.length);
  }, [last7]);

  const streak = useMemo(() => {
    let count = 0;
    for (let i = last7.length - 1; i >= 0; i--) {
      if (last7[i].value > 0) count++;
      else break;
    }
    return count;
  }, [last7]);

  const mostCommon = useMemo(() => {
    const counts = {};
    last7.forEach((item) => {
      if (!item.value) return;
      counts[item.value] = (counts[item.value] || 0) + 1;
    });
    const entries = Object.entries(counts);
    if (!entries.length) return 0;
    entries.sort((a, b) => b[1] - a[1]);
    return Number(entries[0][0]);
  }, [last7]);


  return (
    <SafeScreen>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Heading style={styles.title}>Your insights</Heading>
        </View>
        <Body muted style={styles.sub}>Last 7 days</Body>

        <Card style={styles.card}>
          <CardTitle style={styles.cardTitle}>Mood this week</CardTitle>
          <View style={styles.chart}>
            {last7.map((day) => (
              <View key={day.date} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: day.value ? `${(day.value / 5) * 100}%` : "4%",
                        backgroundColor: day.value
                          ? colors.mood[day.value]
                          : colors.primaryLight,
                      },
                    ]}
                  />
                </View>
                <Caption style={styles.dayLabel}>{day.label}</Caption>
              </View>
            ))}
          </View>
          {isLoading && <Body muted style={styles.helper}>Loading insights...</Body>}
          {isError && !isLoading && (
            <Body muted style={styles.helper}>We could not load your insights.</Body>
          )}
          {!isLoading && !isError && !last7.some((item) => item.value) && (
            <Body muted style={styles.helper}>Add a mood check-in to see your trends.</Body>
          )}
        </Card>

        <View style={styles.statsRow}>
          <Card style={[styles.card, styles.statCard]}>
            <Caption>Average mood</Caption>
            <Body style={styles.statNumber}>{avgMood ? MOOD_LABELS[avgMood] : "-"}</Body>
          </Card>
          <Card style={[styles.card, styles.statCard]}>
            <Caption>Most common mood</Caption>
            <Body style={styles.statNumber}>{mostCommon ? MOOD_LABELS[mostCommon] : "-"}</Body>
          </Card>
        </View>

        <View style={styles.statsRow}>
          <Card style={[styles.card, styles.statCard]}>
            <Caption>Check-in streak</Caption>
            <Body style={styles.statNumber}>
              {streak} {streak === 1 ? "day" : "days"}
            </Body>
          </Card>
        </View>

        {avgMood >= 4 && (
          <Card accent style={styles.card}>
            <BodySmall>
              You have been feeling {MOOD_LABELS[avgMood].toLowerCase()} most of
              this week. That is worth acknowledging.
            </BodySmall>
          </Card>
        )}
        {avgMood > 0 && avgMood <= 2 && (
          <Card accent style={styles.card}>
            <BodySmall>
              It looks like this week has been heavy. Be gentle with yourself.
            </BodySmall>
          </Card>
        )}
      </ScrollView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  title: {
    marginBottom: 0,
  },
  sub: {
    marginBottom: spacing.lg,
  },
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
  card: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    marginBottom: spacing.md,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: 100,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
    gap: spacing.xs,
  },
  barTrack: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: spacing.radius.full,
    minHeight: 4,
  },
  dayLabel: {
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
  },
  statNumber: {
    marginTop: spacing.xs,
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 18,
    color: colors.primary,
  },
  helper: {
    marginTop: spacing.sm,
  },
});

export default InsightsScreen;

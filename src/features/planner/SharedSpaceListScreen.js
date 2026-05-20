import React from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import SafeScreen from '../../components/SafeScreen';
import { Body, Caption, CardTitle, Heading } from '../../components/Typography';
import Card from '../../components/Card';
import Button from '../../components/Button';
import theme from '../../theme';
import { useUser } from '../../hooks/useUser';
import { useSharedSpaces } from '../../hooks/useSharedSpaces';

const { colors, spacing } = theme;

export default function SharedSpaceListScreen() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id;
  const isPremium = !!user?.isPremium;
  const { data: spaces = [], isLoading, isError } = useSharedSpaces(userId);

  return (
    <SafeScreen contentStyle={styles.screen} dismissKeyboard={false}>
      <FlatList
        data={spaces}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <Heading style={styles.title}>Shared spaces</Heading>
            </View>
            <Body muted style={styles.subtitle}>
              Tap a space to open it. Keep the settings tucked away in the info screen.
            </Body>

            <Card style={styles.card}>
              <CardTitle>Create a space</CardTitle>
              <Body muted style={styles.cardBody}>
                Build a shared space for the people who help you carry tasks and support.
              </Body>
              <Button onPress={() => router.push('/(tabs)/planner/shared-space-create')}>
                Create shared space
              </Button>
              {!isPremium && (
                <Caption style={styles.notice}>
                  Creating a space is part of premium. Free users can join up to 2 spaces when invited.
                </Caption>
              )}
            </Card>

            {isLoading && <Body muted style={styles.helper}>Loading spaces...</Body>}
            {isError && <Body muted style={styles.helper}>We could not load shared spaces.</Body>}
            {!isLoading && !isError && spaces.length === 0 && (
              <Card style={styles.emptyCard}>
                <Body muted>No shared spaces yet. Create one to start.</Body>
              </Card>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/planner/shared-space',
                params: { spaceId: item.id },
              })
            }
          >
            <Card style={styles.spaceCard}>
              <View style={styles.spaceRow}>
                <View style={styles.spaceText}>
                  <View style={styles.spaceTitleRow}>
                    <CardTitle>{item.name}</CardTitle>
                    {item.role === 'owner' && (
                      <View style={styles.ownerPill}>
                        <Ionicons name="checkmark-circle" size={12} color={colors.primaryDark} />
                        <Caption style={styles.ownerText}>Owner</Caption>
                      </View>
                    )}
                  </View>
                  <Caption style={styles.spaceHint}>Tap to open</Caption>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            </Card>
          </TouchableOpacity>
        )}
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
    marginBottom: spacing.xs,
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
  cardBody: {
    marginBottom: spacing.sm,
  },
  notice: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  helper: {
    marginBottom: spacing.md,
  },
  emptyCard: {
    marginBottom: spacing.md,
  },
  spaceCard: {
    marginBottom: spacing.md,
  },
  spaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  spaceText: {
    flex: 1,
  },
  spaceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  ownerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.primaryLight,
  },
  ownerText: {
    color: colors.primaryDark,
  },
  spaceHint: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

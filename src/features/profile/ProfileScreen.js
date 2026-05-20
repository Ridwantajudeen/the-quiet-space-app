import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import SafeScreen from '../../components/SafeScreen';
import { Heading, Body, Caption, CardTitle } from '../../components/Typography';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useUser } from '../../hooks/useUser';
import { useProfile } from '../../hooks/useProfile';
import theme from '../../theme';

const { colors, spacing } = theme;

const initialsFromName = (firstName, lastName) => {
  const first = firstName?.trim()?.[0] || '';
  const last = lastName?.trim()?.[0] || '';
  const letters = `${first}${last}`.toUpperCase();
  return letters || 'QS';
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id;
  const { data: profile } = useProfile(userId);
  const firstName = profile?.first_name || user?.firstName || '';
  const lastName = profile?.last_name || user?.lastName || '';
  const email = profile?.email || user?.email || '';
  const avatarUrl = profile?.avatar_url || user?.avatarUrl || null;
  const isPremium = !!(profile?.is_premium ?? user?.isPremium);

  return (
    <SafeScreen dismissKeyboard={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Heading style={styles.title}>Profile</Heading>
        <Body muted style={styles.subtitle}>Your space, your pace.</Body>

        <Card style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Caption style={styles.avatarText}>{initialsFromName(firstName, lastName)}</Caption>
              )}
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <CardTitle>{`${firstName} ${lastName}`.trim() || 'Your name'}</CardTitle>
                {isPremium && (
                  <View style={styles.premiumPill}>
                    <Ionicons name="checkmark-circle" size={12} color={colors.primaryDark} />
                    <Caption style={styles.premiumText}>Premium</Caption>
                  </View>
                )}
              </View>
              <Caption style={styles.email}>{email || 'Email not set'}</Caption>
            </View>
          </View>
          <Button
            variant="outline"
            style={styles.cardButton}
            onPress={() => router.push('/profile/edit')}
          >
            Edit profile
          </Button>
          <Body muted style={styles.inlineNote}>
            {isPremium ? 'Premium is active on this account.' : 'Monthly Premium is ready from the app.'}
          </Body>
        </Card>

        <Card style={styles.card}>
          <CardTitle style={styles.cardTitle}>Settings</CardTitle>
          <Body muted style={styles.caption}>
            Manage reminders, account preferences, privacy, and premium.
          </Body>
          <Button
            variant="outline"
            style={styles.cardButton}
            onPress={() => router.push('/settings')}
          >
            Open settings
          </Button>
          <Button
            variant="ghost"
            style={styles.cardButton}
            onPress={() => router.push('/premium')}
          >
            View Premium
          </Button>
          <Body muted style={styles.inlineNote}>
            Monthly Premium is ready when you want it.
          </Body>
        </Card>

        <View style={styles.footer}>
          <Ionicons name="leaf-outline" size={20} color={colors.textMuted} />
          <Caption style={styles.footerText}>You&apos;re doing enough, exactly as you are.</Caption>
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
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: spacing.radius.full,
  },
  avatarText: {
    color: colors.textPrimary,
    fontFamily: 'DMSans_500Medium',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  premiumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.primaryLight,
  },
  premiumText: {
    color: colors.primaryDark,
    fontFamily: 'DMSans_500Medium',
  },
  email: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  cardTitle: {
    marginBottom: spacing.xs,
  },
  caption: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  inlineNote: {
    marginTop: spacing.xs,
    color: colors.textMuted,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  footerText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
});

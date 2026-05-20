import React from 'react';
import { Linking, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import SafeScreen from '../../components/SafeScreen';
import { Body, BodySmall, Caption, Heading } from '../../components/Typography';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useUser } from '../../hooks/useUser';
import { useProfile } from '../../hooks/useProfile';
import { usePremiumBilling } from '../../hooks/usePremiumBilling';
import { APPLE_EULA_URL, PRIVACY_URL, TERMS_URL } from '../../constants/support';
import theme from '../../theme';

const { colors, spacing } = theme;

const benefits = [
  'Create shared spaces for support groups or families',
  'Access advanced insights for deeper mood patterns',
  'Support the app without losing the calm experience',
];

const billingLabel = Platform.OS === 'android' ? 'Google Play billing' : 'Apple In-App Purchase';
const billingNote =
  Platform.OS === 'android'
    ? '1 month subscription billed through Google Play.'
    : '1 month subscription billed through Apple In-App Purchase.';

export default function PremiumScreen() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id;
  const { data: profile } = useProfile(userId);
  const {
    product,
    status,
    busy,
    productsLoading,
    purchasePremium,
    restorePurchases,
    refreshProducts,
    hasPremium,
  } = usePremiumBilling({ profile });
  const priceLabel = product?.localizedPrice || product?.priceString || '$4.99';
  const purchaseLabel = hasPremium ? 'Premium active' : `Subscribe for ${priceLabel}`;

  return (
    <SafeScreen dismissKeyboard={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={18} color={colors.primaryDark} />
            <Body style={styles.backText}>Back</Body>
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <Caption style={styles.kicker}>Premium</Caption>
          <Heading style={styles.title}>
            Keep the quiet space going with one gentle monthly plan
          </Heading>
          <Body muted style={styles.subtitle}>
            Premium gives you shared spaces and advanced insights without cluttering the app.
          </Body>
        </View>

        <Card style={styles.card}>
          <BodySmall muted style={styles.planLabel}>
            Monthly Premium
          </BodySmall>
          <View style={styles.priceRow}>
            <Heading style={styles.price}>{priceLabel}</Heading>
            <Caption style={styles.priceNote}>{billingNote}</Caption>
          </View>
          <Caption style={styles.storeNote}>Managed through {billingLabel}.</Caption>
          <View style={styles.benefits}>
            {benefits.map((item) => (
              <View key={item} style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.primaryDark} />
                <Body style={styles.benefitText}>{item}</Body>
              </View>
            ))}
          </View>
          <Button
            style={styles.cardButton}
            onPress={purchasePremium}
            loading={busy}
            disabled={hasPremium}
          >
            {purchaseLabel}
          </Button>
          <Button
            variant="outline"
            style={styles.cardButton}
            onPress={restorePurchases}
            loading={busy}
          >
            Restore purchases
          </Button>
          <Button
            variant="ghost"
            size="sm"
            style={styles.inlineAction}
            onPress={refreshProducts}
            loading={productsLoading}
          >
            Refresh subscription info
          </Button>
          {status ? <Caption style={styles.status}>{status}</Caption> : null}
          <View style={styles.linkRow}>
            <Button variant="ghost" size="sm" onPress={() => Linking.openURL(PRIVACY_URL)}>
              Privacy policy
            </Button>
            <Button variant="ghost" size="sm" onPress={() => Linking.openURL(TERMS_URL)}>
              Terms of use
            </Button>
            {Platform.OS === 'ios' ? (
              <Button variant="ghost" size="sm" onPress={() => Linking.openURL(APPLE_EULA_URL)}>
                Apple EULA
              </Button>
            ) : (
              <Caption style={styles.platformNote}>Subscriptions are handled through Google Play.</Caption>
            )}
          </View>
        </Card>

        <Card style={styles.card}>
          <Body muted>
            Complete the monthly subscription below, or restore a previous purchase if needed.
          </Body>
        </Card>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    marginBottom: spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  backText: {
    color: colors.primaryDark,
    fontFamily: 'DMSans_500Medium',
  },
  hero: {
    marginBottom: spacing.lg,
  },
  kicker: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    lineHeight: 22,
  },
  card: {
    marginBottom: spacing.md,
  },
  planLabel: {
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  priceRow: {
    marginBottom: spacing.md,
  },
  price: {
    marginBottom: 2,
  },
  priceNote: {
    color: colors.textMuted,
  },
  storeNote: {
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  benefits: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  benefitText: {
    flex: 1,
    lineHeight: 20,
  },
  status: {
    marginTop: spacing.sm,
    color: colors.textMuted,
  },
  cardButton: {
    marginTop: spacing.xs,
  },
  inlineAction: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  platformNote: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

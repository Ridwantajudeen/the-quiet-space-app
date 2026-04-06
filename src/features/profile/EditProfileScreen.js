import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import SafeScreen from '../../components/SafeScreen';
import { Heading, Body, Caption, CardTitle } from '../../components/Typography';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useUser } from '../../hooks/useUser';
import { useProfile, useUpdateProfile } from '../../hooks/useProfile';
import { uploadAvatar } from './profileService';
import theme from '../../theme';

const { colors, spacing } = theme;

const initialsFromName = (firstName, lastName) => {
  const first = firstName?.trim()?.[0] || '';
  const last = lastName?.trim()?.[0] || '';
  const letters = `${first}${last}`.toUpperCase();
  return letters || 'QS';
};

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, setUser } = useUser();
  const userId = user?.id;
  const { data: profile } = useProfile(userId);
  const { mutateAsync, isPending } = useUpdateProfile(userId);

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name || user?.firstName || '');
    setLastName(profile.last_name || user?.lastName || '');
    setAvatarUrl(profile.avatar_url || user?.avatarUrl || null);
  }, [profile, user]);

  const confirmPhotoPermission = () =>
    new Promise((resolve) => {
      Alert.alert(
        'Profile photo',
        'We use your photo library so you can choose a profile picture.',
        [
          { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Continue', onPress: () => resolve(true) },
        ]
      );
    });

  const handlePickAvatar = async () => {
    const shouldContinue = await confirmPhotoPermission();
    if (!shouldContinue) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to choose a profile image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;
    const picked = result.assets[0];
    if (!picked?.uri) return;

    setSaving(true);
    try {
      const url = await uploadAvatar({ userId, uri: picked.uri });
      if (url) setAvatarUrl(url);
    } catch (err) {
      Alert.alert('Upload failed', err?.message || 'Could not upload photo.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const updated = await mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        avatarUrl,
      });

      setUser({
        ...user,
        firstName: updated.first_name || firstName,
        lastName: updated.last_name || lastName,
        avatarUrl: updated.avatar_url || avatarUrl,
      });

      router.back();
    } catch (err) {
      Alert.alert('Update failed', err?.message || 'We could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const initials = initialsFromName(firstName, lastName);

  return (
    <SafeScreen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Heading style={styles.title}>Edit profile</Heading>
        </View>

        <Card style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Caption style={styles.avatarText}>{initials}</Caption>
              )}
            </View>
            <View style={styles.avatarInfo}>
              <CardTitle>Profile photo</CardTitle>
              <Body muted style={styles.caption}>Choose a calm, clear image.</Body>
              <Button
                variant="outline"
                style={styles.cardButton}
                onPress={handlePickAvatar}
                loading={saving}
              >
                Change photo
              </Button>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <CardTitle>Name</CardTitle>
          <Body muted style={styles.caption}>
            {`${firstName} ${lastName}`.trim() || 'Your name'}
          </Body>
          <Caption style={styles.note}>
            Names are set during sign up. If you need a change, contact support.
          </Caption>
        </Card>

        <Button style={styles.saveButton} onPress={handleSave} loading={saving || isPending}>
          Save changes
        </Button>
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
    marginBottom: spacing.sm,
  },
  backButton: {
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  title: {
    marginBottom: 0,
  },
  card: {
    marginBottom: spacing.md,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'DMSans_500Medium',
    color: colors.textPrimary,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: spacing.radius.full,
  },
  avatarInfo: {
    flex: 1,
  },
  caption: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  note: {
    color: colors.textMuted,
  },
  cardButton: {
    marginTop: spacing.xs,
  },
  saveButton: {
    width: '100%',
  },
});

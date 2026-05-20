import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import SafeScreen from '../../components/SafeScreen';
import { Heading, Body, Caption } from '../../components/Typography';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { login, requestPasswordReset } from '../../features/auth/authService';
import { useUser } from '../../hooks/useUser';
import theme from '../../theme';

const { spacing } = theme;

export default function LoginScreen() {
  const router = useRouter();
  const { setUser, user, isReady } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    setError('');
    setResetMessage('');
    setLoading(true);
    try {
      const result = await login({ email, password });
      if (result?.user) {
        setUser({
          ...result.user,
          token: result.token || null,
          refreshToken: result.refreshToken || null,
        });
      }
      router.replace('/(tabs)');
    } catch (err) {
      setError(
        err?.message ||
          "We couldn't sign you in just yet. Please check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setResetMessage('');
    if (!email) {
      setResetMessage('Please enter your email, then we can send a reset link.');
      return;
    }

    try {
      await requestPasswordReset(email);
      setResetMessage('We sent a reset link to your email.');
    } catch (err) {
      setResetMessage(err?.message || 'We could not send the reset email yet.');
    }
  };

  useEffect(() => {
    if (isReady && user) {
      router.replace('/(tabs)');
    }
  }, [isReady, user, router]);

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Heading style={styles.title}>Welcome back</Heading>
        <Body muted style={styles.subtitle}>
          Sign in to continue your quiet space.
        </Body>

        <Card style={styles.card}>
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (error) setError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={styles.passwordField}>
            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (error) setError('');
              }}
              secureTextEntry={!showPassword}
              inputStyle={styles.passwordInput}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              style={styles.eyeButton}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#7A6870" />
            </TouchableOpacity>
          </View>
          {!!error && <Caption style={styles.error}>{error}</Caption>}
          {!!resetMessage && <Caption style={styles.resetMessage}>{resetMessage}</Caption>}
          <TouchableOpacity style={styles.resetLink} onPress={handleResetPassword}>
            <Caption style={styles.resetLinkText}>Forgot password?</Caption>
          </TouchableOpacity>
          <Button onPress={handleLogin} loading={loading} disabled={!email || !password}>
            Sign in
          </Button>
        </Card>

        <View style={styles.footer}>
          <Caption>Don&apos;t have an account?</Caption>
          <Button variant="ghost" onPress={() => router.push('/(auth)/signup')}>
            Create one
          </Button>
        </View>
      </KeyboardAvoidingView>
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
  subtitle: {
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.lg,
  },
  footer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  passwordField: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 34,
    height: 24,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#D8756A',
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  resetMessage: {
    color: '#7A6870',
    marginBottom: spacing.sm,
  },
  resetLink: {
    alignSelf: 'flex-end',
    marginBottom: spacing.sm,
  },
  resetLinkText: {
    color: '#A06878',
  },
});



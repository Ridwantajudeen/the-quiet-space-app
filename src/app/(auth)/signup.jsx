import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import SafeScreen from '../../components/SafeScreen';
import { Heading, Body, Caption } from '../../components/Typography';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { signup } from '../../features/auth/authService';
import { useUser } from '../../hooks/useUser';
import theme from '../../theme';

const { spacing } = theme;

export default function SignupScreen() {
  const router = useRouter();
  const { setUser } = useUser();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const clearError = (key) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const next = {};

    if (!firstName.trim()) {
      next.firstName = 'A first name keeps this space personal.';
    }
    if (!lastName.trim()) {
      next.lastName = 'A last name helps us keep things tidy.';
    }
    if (!email.trim()) {
      next.email = 'Please add an email so we can save your space.';
    }
    if (!password) {
      next.password = 'Create a password to keep things safe.';
    } else if (password.length < 8) {
      next.password = "Let's use at least 8 characters.";
    } else if (!/[A-Z]/.test(password)) {
      next.password = 'Add one uppercase letter for a little extra strength.';
    } else if (!/[0-9]/.test(password)) {
      next.password = 'Include one number for extra security.';
    }
    if (!confirmPassword) {
      next.confirmPassword = 'Please re-enter your password.';
    } else if (password && confirmPassword !== password) {
      next.confirmPassword = "Passwords don't match yet. Take a breath and try again.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await signup({ firstName, lastName, email, password });
      if (result?.user) {
        setUser({
          ...result.user,
          token: result.token || null,
          refreshToken: result.refreshToken || null,
        });
      }
      router.replace('/(tabs)');
    } catch (err) {
      const message = err?.message || "We couldn't create your account just yet. Please try again.";
      if (message.toLowerCase().includes('already in use')) {
        setErrors((prev) => ({ ...prev, email: message }));
      } else {
        setErrors((prev) => ({ ...prev, form: message }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeScreen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Heading style={styles.title}>Create account</Heading>
        <Body muted style={styles.subtitle}>
          Start your calm journey today.
        </Body>

        <Card style={styles.card}>
          <Input
            label="First name"
            placeholder="Your first name"
            value={firstName}
            onChangeText={(value) => {
              setFirstName(value);
              clearError('firstName');
            }}
          />
          {!!errors.firstName && <Caption style={styles.error}>{errors.firstName}</Caption>}
          <Input
            label="Last name"
            placeholder="Your last name"
            value={lastName}
            onChangeText={(value) => {
              setLastName(value);
              clearError('lastName');
            }}
          />
          {!!errors.lastName && <Caption style={styles.error}>{errors.lastName}</Caption>}
          <Input
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              clearError('email');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {!!errors.email && <Caption style={styles.error}>{errors.email}</Caption>}
          <View style={styles.passwordField}>
            <Input
              label="Password"
              placeholder="Create a password"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                clearError('password');
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
          {!!errors.password && <Caption style={styles.error}>{errors.password}</Caption>}
          <View style={styles.passwordField}>
            <Input
              label="Confirm password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                clearError('confirmPassword');
              }}
              secureTextEntry={!showConfirmPassword}
              inputStyle={styles.passwordInput}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword((prev) => !prev)}
              style={styles.eyeButton}
              accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} color="#7A6870" />
            </TouchableOpacity>
          </View>
          {!!errors.confirmPassword && (
            <Caption style={styles.error}>{errors.confirmPassword}</Caption>
          )}
          <Button
            onPress={handleSignup}
            loading={loading}
            disabled={!firstName || !lastName || !email || !password || !confirmPassword}
          >
            Create account
          </Button>
          {!!errors.form && <Caption style={styles.error}>{errors.form}</Caption>}
        </Card>

        <View style={styles.footer}>
          <Caption>Already have an account?</Caption>
          <Button variant="ghost" onPress={() => router.back()}>
            Sign in
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
});

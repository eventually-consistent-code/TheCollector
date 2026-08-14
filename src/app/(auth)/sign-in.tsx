/**
 * Purpose: Sign-in screen — email/password against Supabase. Successful
 * sign-in flips the root guard; no manual navigation needed.
 * Author(s): John Reed
 */

import { Link } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { supabase } from '@/auth/client';
import { ActionButton, Field } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// Constants

// Semantic error red — deliberate local, not a palette token.
const ERROR_RED = '#D93025';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title" style={styles.wordmark}>
          The Collector
        </ThemedText>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          autoFocus
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
        />
        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}
        <ActionButton
          title={busy ? 'Signing in…' : 'Sign In'}
          onPress={signIn}
          disabled={busy || !email.trim() || !password}
        />
        <Link href="./sign-up">
          <ThemedText type="link">No account? Create one</ThemedText>
        </Link>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three },
  // Serif wordmark — the study's nameplate.
  wordmark: {
    textAlign: 'center',
    marginTop: Spacing.five,
    marginBottom: Spacing.five,
  },
  error: { color: ERROR_RED, marginBottom: 12 },
});

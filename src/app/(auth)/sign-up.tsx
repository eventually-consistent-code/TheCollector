/**
 * Purpose: Sign-up screen — email/password. Confirmation is disabled on the
 * project, so signUp returns a live session and the guard flips straight in.
 * Author(s): John Reed
 */

import { Link } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { supabase } from '@/auth/client';
import { ActionButton, Field } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signUp = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signUp({
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
      <ScrollView contentContainerStyle={{ padding: 16 }}>
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
          label="Password (min 6 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />
        {error && (
          <ThemedText type="small" style={{ color: '#D93025', marginBottom: 12 }}>
            {error}
          </ThemedText>
        )}
        <ActionButton
          title={busy ? 'Creating…' : 'Create Account'}
          onPress={signUp}
          disabled={busy || !email.trim() || password.length < 6}
        />
        <Link href="./sign-in">
          <ThemedText type="link">Already have an account? Sign in</ThemedText>
        </Link>
      </ScrollView>
    </ThemedView>
  );
}

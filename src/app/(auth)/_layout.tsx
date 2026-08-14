/**
 * Purpose: Auth stack — sign-in / sign-up.
 * Author(s): John Reed
 */

import { Stack } from 'expo-router';

import { FontFamily } from '@/constants/theme';

export default function AuthLayout() {
  return (
    // Serif header titles — the Estate & Ember display voice.
    <Stack screenOptions={{ headerTitleStyle: { fontFamily: FontFamily.serifBold } }}>
      <Stack.Screen name="sign-in" options={{ title: 'Sign In' }} />
      <Stack.Screen name="sign-up" options={{ title: 'Create Account' }} />
    </Stack>
  );
}

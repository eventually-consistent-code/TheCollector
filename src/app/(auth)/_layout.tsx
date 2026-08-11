/**
 * Purpose: Auth stack — sign-in / sign-up.
 * Author(s): John Reed
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="sign-in" options={{ title: 'Sign In' }} />
      <Stack.Screen name="sign-up" options={{ title: 'Create Account' }} />
    </Stack>
  );
}

/**
 * Purpose: Root layout — session-gated routing. Signed out → (auth) group;
 * signed in → (app) group wrapped in the PowerSync provider.
 * Author(s): John Reed
 */

import { PowerSyncContext } from '@powersync/react';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { SessionProvider, useSession } from '@/auth/session';
import { db } from '@/db/database';
import { useSyncLifecycle } from '@/db/sync';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, ready } = useSession();

  // Adopt-then-connect whenever a session lands.
  useSyncLifecycle(db, session);

  // Hold the splash until both the db and the initial session are known.
  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <Stack>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    db.init();
    if (__DEV__) {
      // Debug handle for dev-time inspection (e.g. CDP console).
      (globalThis as Record<string, unknown>).__db = db;
    }
  }, []);

  return (
    <PowerSyncContext.Provider value={db}>
      <SessionProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootNavigator />
        </ThemeProvider>
      </SessionProvider>
    </PowerSyncContext.Provider>
  );
}

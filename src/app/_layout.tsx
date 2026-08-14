/**
 * Purpose: Root layout — session-gated routing. Signed out → (auth) group;
 * signed in → (app) group wrapped in the PowerSync provider. Also owns the
 * Estate & Ember nav theme and the custom font load, both folded into the
 * splash-hold gate.
 * Author(s): John Reed
 */

import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold } from '@expo-google-fonts/geist';
import {
  LibreCaslonText_400Regular,
  LibreCaslonText_700Bold,
} from '@expo-google-fonts/libre-caslon-text';
import { PowerSyncContext } from '@powersync/react';
import { useFonts } from 'expo-font';
import { DarkTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { SessionProvider, useSession } from '@/auth/session';
import { Colors } from '@/constants/theme';
import { db } from '@/db/database';
import { useSyncLifecycle } from '@/db/sync';

SplashScreen.preventAutoHideAsync();

// Estate & Ember nav chrome — charcoal card/background, vellum text, brass
// hairline borders, amber accents. Dark-only, so this is the only theme.
const EstateEmberTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.highlight,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.hairline,
    notification: Colors.dark.highlight,
  },
};

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { session, ready } = useSession();

  // Adopt-then-connect whenever a session lands.
  useSyncLifecycle(db, session);

  // Hold the splash until the db, the initial session, and the fonts are
  // all known — no unstyled-text flash on first paint.
  const allReady = ready && fontsReady;

  useEffect(() => {
    if (allReady) {
      SplashScreen.hideAsync();
    }
  }, [allReady]);

  if (!allReady) {
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
  // Estate & Ember faces — serif display + sans body/data weights.
  const [fontsLoaded, fontError] = useFonts({
    LibreCaslonText_400Regular,
    LibreCaslonText_700Bold,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });

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
        <ThemeProvider value={EstateEmberTheme}>
          {/* A font error should degrade to system faces, not hold the splash forever. */}
          <RootNavigator fontsReady={fontsLoaded || !!fontError} />
        </ThemeProvider>
      </SessionProvider>
    </PowerSyncContext.Provider>
  );
}

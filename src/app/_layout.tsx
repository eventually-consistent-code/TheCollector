/**
 * Purpose: Root layout — PowerSync provider wrapping the router stack so
 * every screen can run reactive queries against the local db.
 * Author(s): John Reed
 */

import { PowerSyncContext } from '@powersync/react';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { db } from '@/db/database';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Waits for the local db before dropping the splash — first query is free.
  useEffect(() => {
    db.init().finally(() => SplashScreen.hideAsync());
    if (__DEV__) {
      // Debug handle for dev-time inspection (e.g. CDP console).
      (globalThis as Record<string, unknown>).__db = db;
    }
  }, []);

  return (
    <PowerSyncContext.Provider value={db}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ title: 'Collections' }} />
          <Stack.Screen name="collection/new" options={{ title: 'New Collection' }} />
          <Stack.Screen name="collection/[id]/index" options={{ title: 'Collection' }} />
          <Stack.Screen name="collection/[id]/new-item" options={{ title: 'New Item' }} />
          <Stack.Screen name="item/[id]" options={{ title: 'Item' }} />
        </Stack>
      </ThemeProvider>
    </PowerSyncContext.Provider>
  );
}

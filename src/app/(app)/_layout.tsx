/**
 * Purpose: Signed-in app stack — the tab shell anchors at the bottom, and
 * the collection/item flows push over it as stack screens.
 * Author(s): John Reed
 */

import { Stack } from 'expo-router';

import { FontFamily } from '@/constants/theme';

// Anchor deep links and initial routes on the tab shell.
export const unstable_settings = { anchor: '(tabs)' };

export default function AppLayout() {
  return (
    // Serif header titles — the Estate & Ember display voice.
    <Stack screenOptions={{ headerTitleStyle: { fontFamily: FontFamily.serifBold } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ title: 'Search' }} />
      <Stack.Screen name="collection/new" options={{ title: 'New Collection' }} />
      <Stack.Screen name="collection/[id]/index" options={{ title: 'Collection' }} />
      <Stack.Screen name="collection/[id]/new-item" options={{ title: 'New Item' }} />
      <Stack.Screen name="item/[id]" options={{ title: 'Item' }} />
    </Stack>
  );
}

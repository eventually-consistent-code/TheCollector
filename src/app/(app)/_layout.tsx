/**
 * Purpose: Signed-in app stack — screen titles for the collection/item flows.
 * Author(s): John Reed
 */

import { Stack } from 'expo-router';

import { FontFamily } from '@/constants/theme';

export default function AppLayout() {
  return (
    // Serif header titles — the Estate & Ember display voice.
    <Stack screenOptions={{ headerTitleStyle: { fontFamily: FontFamily.serifBold } }}>
      <Stack.Screen name="index" options={{ title: 'Collections' }} />
      <Stack.Screen name="search" options={{ title: 'Search' }} />
      <Stack.Screen name="collection/new" options={{ title: 'New Collection' }} />
      <Stack.Screen name="collection/[id]/index" options={{ title: 'Collection' }} />
      <Stack.Screen name="collection/[id]/new-item" options={{ title: 'New Item' }} />
      <Stack.Screen name="item/[id]" options={{ title: 'Item' }} />
    </Stack>
  );
}

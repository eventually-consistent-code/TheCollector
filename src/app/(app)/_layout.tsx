/**
 * Purpose: Signed-in app stack — screen titles for the collection/item flows.
 * Author(s): John Reed
 */

import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Collections' }} />
      <Stack.Screen name="collection/new" options={{ title: 'New Collection' }} />
      <Stack.Screen name="collection/[id]/index" options={{ title: 'Collection' }} />
      <Stack.Screen name="collection/[id]/new-item" options={{ title: 'New Item' }} />
      <Stack.Screen name="item/[id]" options={{ title: 'Item' }} />
    </Stack>
  );
}

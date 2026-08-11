/**
 * Purpose: New-item screen — shared form, saves into this collection.
 * Author(s): John Reed
 */

import { usePowerSync } from '@powersync/react';
import { router, useLocalSearchParams } from 'expo-router';

import { ItemForm } from '@/components/item-form';
import { ThemedView } from '@/components/themed-view';
import { createItem } from '@/db/crud';

export default function NewItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = usePowerSync();

  return (
    <ThemedView style={{ flex: 1 }}>
      <ItemForm
        saveLabel="Add Item"
        onSave={async (input) => {
          await createItem(db, id, input);
          router.back();
        }}
      />
    </ThemedView>
  );
}

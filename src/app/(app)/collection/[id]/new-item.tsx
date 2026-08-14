/**
 * Purpose: New-item screen — shared form, saves into this collection.
 * Author(s): John Reed
 */

import { usePowerSync } from '@powersync/react';
import { router, useLocalSearchParams } from 'expo-router';

import { useSession } from '@/auth/session';
import { ItemForm } from '@/components/item-form';
import { ThemedView } from '@/components/themed-view';
import { createItem } from '@/db/crud';
import { useCollection } from '@/db/hooks';
import { templateFor } from '@/templates';

// Scan hands prefill over as a JSON search param; bad JSON just means an
// empty form, never a crash.
function parsePrefill(raw: string | undefined) {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as { name?: string; customFields?: Record<string, string | number | boolean> };
  } catch {
    return undefined;
  }
}

export default function NewItemScreen() {
  const { id, prefill } = useLocalSearchParams<{ id: string; prefill?: string }>();
  const db = usePowerSync();
  const { session } = useSession();
  const { data: collectionRows } = useCollection(id);
  const template = templateFor(collectionRows?.[0]?.vertical);

  return (
    <ThemedView style={{ flex: 1 }}>
      <ItemForm
        template={template}
        prefill={parsePrefill(prefill)}
        saveLabel="Add Item"
        onSave={async (input) => {
          if (!session) {
            return;
          }
          await createItem(db, id, input, session.user.id);
          router.back();
        }}
      />
    </ThemedView>
  );
}

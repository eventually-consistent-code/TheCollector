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
import { saveLookupImage } from '@/db/lookup-image';
import { templateFor } from '@/templates';

// Scan hands prefill over as a JSON search param; bad JSON just means an
// empty form, never a crash.
function parsePrefill(raw: string | undefined) {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as {
      name?: string;
      customFields?: Record<string, string | number | boolean>;
      imageUrl?: string;
    };
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
  const parsed = parsePrefill(prefill);

  return (
    <ThemedView style={{ flex: 1 }}>
      <ItemForm
        template={template}
        prefill={parsed}
        saveLabel="Add Item"
        onSave={async (input) => {
          if (!session) {
            return;
          }
          const itemId = await createItem(db, id, input, session.user.id);
          // Lookup cover art rides along after the save — fire-and-forget,
          // never blocks the form and never fails the item.
          void saveLookupImage({
            db,
            itemId,
            userId: session.user.id,
            imageUrl: parsed?.imageUrl,
          });
          router.back();
        }}
      />
    </ThemedView>
  );
}

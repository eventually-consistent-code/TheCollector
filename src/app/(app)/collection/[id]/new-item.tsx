/**
 * Purpose: New-item screen — shared form, saves into this collection.
 * Author(s): John Reed
 */

import { usePowerSync } from '@powersync/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';

import { useSession } from '@/auth/session';
import { ItemForm } from '@/components/item-form';
import { ThemedView } from '@/components/themed-view';
import { createItem } from '@/db/crud';
import { useCollection } from '@/db/hooks';
import { saveLookupImage } from '@/db/lookup-image';
import { getAdapter } from '@/metadata';
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
  const adapter = getAdapter(template.id);
  // Cover art from a type-ahead pick — a ref, not state: nothing needs to
  // re-render, the save handler just reads whatever landed last.
  const pickedImageUrl = useRef<string | undefined>(undefined);

  return (
    <ThemedView style={{ flex: 1 }}>
      <ItemForm
        template={template}
        prefill={parsed}
        lookup={
          adapter
            ? {
                adapter,
                onImageUrl: (url) => {
                  pickedImageUrl.current = url;
                },
              }
            : undefined
        }
        saveLabel="Add Item"
        onSave={async (input) => {
          if (!session) {
            return;
          }
          const itemId = await createItem(db, id, input, session.user.id);
          // Lookup cover art rides along after the save — fire-and-forget,
          // never blocks the form and never fails the item. A type-ahead
          // pick beats the scan prefill; it is the fresher choice.
          void saveLookupImage({
            db,
            itemId,
            userId: session.user.id,
            imageUrl: pickedImageUrl.current ?? parsed?.imageUrl,
          });
          router.back();
        }}
      />
    </ThemedView>
  );
}

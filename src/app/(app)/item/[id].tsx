/**
 * Purpose: Item detail — edit via shared form, two-tap delete.
 * Author(s): John Reed
 */

import { usePowerSync } from '@powersync/react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useSession } from '@/auth/session';
import { ActionButton } from '@/components/form';
import { ItemForm } from '@/components/item-form';
import { PhotoSection } from '@/components/photo-section';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { deleteItem, updateItem } from '@/db/crud';
import { useCollection, useItem } from '@/db/hooks';
import { templateFor } from '@/templates';

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = usePowerSync();
  const { session } = useSession();
  const { data: rows } = useItem(id);
  const item = rows?.[0];
  const { data: collectionRows } = useCollection(item?.collection_id ?? undefined);
  const template = templateFor(collectionRows?.[0]?.vertical);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!item) {
    return <ThemedView style={{ flex: 1 }} />;
  }

  const onDelete = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    await deleteItem(db, item.id);
    router.back();
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: item.name ?? 'Item' }} />
      <ItemForm
        // Remount the form if another writer changes this row underneath us.
        key={item.updated_at ?? item.id}
        template={template}
        initial={item}
        saveLabel="Save"
        onSave={async (input) => {
          await updateItem(db, item.id, input);
          router.back();
        }}
        footer={
          session ? <PhotoSection itemId={item.id} userId={session.user.id} /> : null
        }
      />
      <View style={{ padding: Spacing.three }}>
        <ActionButton
          title={confirmingDelete ? 'Really delete? (tap again)' : 'Delete Item'}
          onPress={onDelete}
          destructive
        />
      </View>
    </ThemedView>
  );
}

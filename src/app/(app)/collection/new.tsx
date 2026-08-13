/**
 * Purpose: Create-collection screen — name + vertical, then straight into
 * the new collection.
 * Author(s): John Reed
 */

import { usePowerSync } from '@powersync/react';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { useSession } from '@/auth/session';
import { ActionButton, ChipPicker, Field } from '@/components/form';
import { ThemedView } from '@/components/themed-view';
import { createCollection } from '@/db/crud';
import { VERTICAL_IDS } from '@/templates';

export default function NewCollectionScreen() {
  const db = usePowerSync();
  const { session } = useSession();
  const [name, setName] = useState('');
  const [vertical, setVertical] = useState('other');

  const save = async () => {
    if (!session) {
      return;
    }
    const id = await createCollection(db, {
      name: name.trim(),
      vertical,
      userId: session.user.id,
    });
    router.replace(`/collection/${id}`);
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Field
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="My Vinyl"
          autoFocus
        />
        <ChipPicker
          label="Vertical"
          options={VERTICAL_IDS}
          value={vertical}
          onChange={setVertical}
        />
        <ActionButton title="Create" onPress={save} disabled={!name.trim()} />
      </ScrollView>
    </ThemedView>
  );
}

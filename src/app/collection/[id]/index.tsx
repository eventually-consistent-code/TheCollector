/**
 * Purpose: Collection detail — live item list, inline rename, delete with
 * confirm, add-item entry point.
 * Author(s): John Reed
 */

import { usePowerSync } from '@powersync/react';
import { Link, Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ActionButton, Field } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { deleteCollection, renameCollection } from '@/db/crud';
import { useCollection, useItems } from '@/db/hooks';
import { useTheme } from '@/hooks/use-theme';
import { centsToDisplay } from '@/lib/money';

export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = usePowerSync();
  const theme = useTheme();
  const { data: collectionRows } = useCollection(id);
  const { data: items } = useItems(id);
  const collection = collectionRows?.[0];
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!collection) {
    return <ThemedView style={styles.container} />;
  }

  const saveRename = async () => {
    await renameCollection(db, collection.id, draftName.trim());
    setEditing(false);
  };

  // Two-tap delete — first tap arms, second confirms. No blocking dialogs.
  const onDelete = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    await deleteCollection(db, collection.id);
    router.dismissTo('/');
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: collection.name ?? 'Collection' }} />
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            {editing ? (
              <>
                <Field label="Rename" value={draftName} onChangeText={setDraftName} autoFocus />
                <ActionButton title="Save" onPress={saveRename} disabled={!draftName.trim()} />
              </>
            ) : (
              <Pressable
                onPress={() => {
                  setDraftName(collection.name ?? '');
                  setEditing(true);
                }}
              >
                <ThemedText type="small" themeColor="textSecondary">
                  {collection.vertical} · tap to rename
                </ThemedText>
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            Nothing cataloged yet.
          </ThemedText>
        }
        renderItem={({ item }) => (
          <Link href={`/item/${item.id}`} asChild>
            <Pressable
              style={StyleSheet.flatten([
                styles.card,
                { backgroundColor: theme.backgroundElement },
              ])}
            >
              <ThemedText type="subtitle">{item.name}</ThemedText>
              {item.current_value_cents != null && (
                <ThemedText type="small" themeColor="textSecondary">
                  {centsToDisplay(item.current_value_cents)}
                </ThemedText>
              )}
            </Pressable>
          </Link>
        )}
      />
      <View style={styles.footer}>
        <Link href={`/collection/${collection.id}/new-item`} asChild>
          <Pressable
            style={StyleSheet.flatten([
              styles.addButton,
              { backgroundColor: theme.backgroundSelected },
            ])}
          >
            <ThemedText type="subtitle">+ Add Item</ThemedText>
          </Pressable>
        </Link>
        <ActionButton
          title={confirmingDelete ? 'Really delete? (tap again)' : 'Delete Collection'}
          onPress={onDelete}
          destructive
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
  header: { marginBottom: 12 },
  empty: { textAlign: 'center', marginTop: 32 },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 4,
  },
  footer: { padding: 16, gap: 0 },
  addButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
});

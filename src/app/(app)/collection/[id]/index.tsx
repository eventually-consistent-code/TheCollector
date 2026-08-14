/**
 * Purpose: Collection detail — live item list with template-driven filters
 * and sort, inline rename, delete with confirm, add-item entry point.
 * Author(s): John Reed
 */

import { usePowerSync } from '@powersync/react';
import { Link, Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ActionButton, Field } from '@/components/form';
import { ItemFilterBar } from '@/components/item-filter-bar';
import {
  EMPTY_FILTER_STATE,
  toItemListFilter,
  type ItemFilterState,
} from '@/components/item-filter-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { deleteCollection, parseCustomFields, renameCollection } from '@/db/crud';
import { useCollection, useCollectionTags, useFilteredItems, useItems } from '@/db/hooks';
import { DEFAULT_SORT, type ItemSort } from '@/db/query';
import { useTheme } from '@/hooks/use-theme';
import { centsToDisplay } from '@/lib/money';
import { getAdapter } from '@/metadata';
import { subtitleFor, templateFor, type FieldValues } from '@/templates';

export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = usePowerSync();
  const theme = useTheme();
  const { data: collectionRows } = useCollection(id);
  const collection = collectionRows?.[0];
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Filter + sort state feeds the query layer; the list re-runs reactively.
  const [sort, setSort] = useState<ItemSort>(DEFAULT_SORT);
  const [filterState, setFilterState] = useState<ItemFilterState>(EMPTY_FILTER_STATE);
  const template = templateFor(collection?.vertical);
  const listFilter = useMemo(
    () => toItemListFilter(template, filterState),
    [template, filterState]
  );
  const { data: items } = useFilteredItems(id, sort, listFilter);
  // Unfiltered count for the "N of M" line.
  const { data: allItems } = useItems(id);
  const { data: tagRows } = useCollectionTags(id);

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
            {/* Filter bar only earns its space once there is something to filter. */}
            {(allItems?.length ?? 0) > 0 && (
              <ItemFilterBar
                template={template}
                sort={sort}
                onSort={setSort}
                state={filterState}
                onState={setFilterState}
                tags={(tagRows ?? []).map((r) => r.tag)}
                shown={items?.length ?? 0}
                total={allItems?.length ?? 0}
              />
            )}
          </View>
        }
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            {(allItems?.length ?? 0) > 0
              ? 'No items match these filters.'
              : 'Nothing cataloged yet.'}
          </ThemedText>
        }
        renderItem={({ item }) => {
          const subtitle = subtitleFor(
            template,
            parseCustomFields(item.custom_fields) as FieldValues
          );
          const line = [subtitle, item.current_value_cents != null ? centsToDisplay(item.current_value_cents) : null]
            .filter(Boolean)
            .join(' · ');
          return (
            <Link href={`/item/${item.id}`} asChild>
              <Pressable
                style={StyleSheet.flatten([
                  styles.card,
                  { backgroundColor: theme.backgroundElement },
                ])}
              >
                <ThemedText type="subtitle">{item.name}</ThemedText>
                {line !== '' && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {line}
                  </ThemedText>
                )}
              </Pressable>
            </Link>
          );
        }}
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
        {/* Scan only shows where the vertical has a metadata adapter. */}
        {getAdapter(collection.vertical ?? '') && (
          <Link href={`/collection/${collection.id}/scan`} asChild>
            <Pressable
              style={StyleSheet.flatten([
                styles.addButton,
                { backgroundColor: theme.backgroundElement },
              ])}
            >
              <ThemedText type="subtitle">Scan to Add</ThemedText>
            </Pressable>
          </Link>
        )}
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

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
import { ItemThumb } from '@/components/item-thumb';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontFamily, Palette, Spacing, Type } from '@/constants/theme';
import { deleteCollection, parseCustomFields, renameCollection } from '@/db/crud';
import {
  useCollection,
  useCollectionTags,
  useCollectionValueTotals,
  useFilteredItems,
  useItems,
} from '@/db/hooks';
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
  // Rolled-up worth for the header plaque, live as items change.
  const { data: totalsRows } = useCollectionValueTotals(id);
  const valueCents = totalsRows?.[0]?.value_cents ?? 0;
  const costCents = totalsRows?.[0]?.cost_cents ?? 0;

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
                <ThemedText themeColor="textSecondary" style={Type.label}>
                  {collection.vertical} · tap to rename
                </ThemedText>
              </Pressable>
            )}
            {/* Value plaque — only once the collection is worth something;
                no $0.00 brass for an unappraised shelf. */}
            {valueCents > 0 && (
              <View
                style={StyleSheet.flatten([
                  styles.valuePlaque,
                  { backgroundColor: theme.surfaceRaised, borderColor: theme.hairline },
                ])}
              >
                <ThemedText themeColor="textSecondary" style={Type.label}>
                  Collection Value
                </ThemedText>
                <ThemedText style={styles.valueTotal}>
                  {centsToDisplay(valueCents)}
                </ThemedText>
                {/* Cost basis + gain/loss, only when a cost was ever recorded. */}
                {costCents > 0 && (
                  <ThemedText themeColor="textSecondary" style={Type.data}>
                    {`cost ${centsToDisplay(costCents)} · ${
                      valueCents >= costCents ? '+' : '−'
                    }${centsToDisplay(Math.abs(valueCents - costCents))}`}
                  </ThemedText>
                )}
              </View>
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
          const value =
            item.current_value_cents != null ? centsToDisplay(item.current_value_cents) : null;
          return (
            <Link href={`/item/${item.id}`} asChild>
              {/* Collector's-tray card — serif name, muted subtitle, amber value. */}
              <Pressable
                style={StyleSheet.flatten([
                  styles.card,
                  { backgroundColor: theme.surfaceRaised, borderColor: theme.hairline },
                ])}
              >
                <View style={styles.cardRow}>
                  {/* First photo (or placeholder) leads the row. */}
                  <ItemThumb uri={item.thumb_uri} />
                  <View style={styles.cardMain}>
                    <ThemedText style={styles.cardName}>{item.name}</ThemedText>
                    {!!subtitle && (
                      <ThemedText themeColor="textSecondary" style={Type.data}>
                        {subtitle}
                      </ThemedText>
                    )}
                  </View>
                  {value != null && (
                    <ThemedText themeColor="highlight" style={styles.cardValue}>
                      {value}
                    </ThemedText>
                  )}
                </View>
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
              { backgroundColor: theme.accent },
            ])}
          >
            <ThemedText style={styles.buttonText}>+ Add Item</ThemedText>
          </Pressable>
        </Link>
        {/* Scan only shows where the vertical has a metadata adapter. */}
        {getAdapter(collection.vertical ?? '') && (
          <Link href={`/collection/${collection.id}/scan`} asChild>
            <Pressable
              style={StyleSheet.flatten([
                styles.addButton,
                styles.addButtonQuiet,
                { backgroundColor: theme.surfaceRaised, borderColor: theme.hairline },
              ])}
            >
              <ThemedText style={styles.buttonText}>Scan to Add</ThemedText>
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
  list: { padding: Spacing.three },
  header: { marginBottom: Spacing.three },
  // Brass-plaque treatment at collection scale — same 8px radius + hairline
  // as the Dashboard hero, padding stepped down to keep list density.
  valuePlaque: {
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.one,
    marginTop: Spacing.three,
    marginBottom: Spacing.three,
  },
  // The headline number — amber Geist semibold, one size under the hero.
  valueTotal: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 24,
    lineHeight: 30,
    color: Palette.amber,
  },
  empty: { textAlign: 'center', marginTop: Spacing.five },
  // 8px card radius + 1px brass hairline per the Estate & Ember system.
  // Padding stepped down from four to three so the 60px thumb doesn't
  // balloon the row — density stays at the mock's compact tray height.
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  // Centered so the 60px thumb and the text block share a midline; the
  // card stays compact — the thumb, not padding, sets the row height.
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  cardMain: { flex: 1, gap: Spacing.one },
  cardName: { ...Type.title },
  // Value rides the amber highlight, right-aligned in Geist.
  cardValue: { ...Type.data, fontFamily: FontFamily.sansSemiBold, textAlign: 'right' },
  footer: { padding: Spacing.three, gap: 0 },
  addButton: {
    borderRadius: 8,
    padding: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  addButtonQuiet: { borderWidth: 1 },
  buttonText: { ...Type.body, fontFamily: FontFamily.sansSemiBold },
});

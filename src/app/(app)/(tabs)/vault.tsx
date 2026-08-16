/**
 * Purpose: The Vault — live collections list with item counts, entry point
 * for creating a collection. Lives on the tab shell now.
 * Author(s): John Reed
 */

import { useQuery } from '@powersync/react';
import { Link, Tabs } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ItemThumb } from '@/components/item-thumb';
import { SyncStatusBar } from '@/components/sync-status';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontFamily, Spacing, Type } from '@/constants/theme';
import { COLLECTION_COVER_URI_SQL } from '@/db/query';
import { useTheme } from '@/hooks/use-theme';

// Constants

// Collection covers sit a step above the 60px item-row thumbs — the
// Vault's cards are the marquee tier of the tray hierarchy.
const COVER_SIZE = 64;

interface CollectionRow {
  id: string;
  name: string;
  vertical: string;
  item_count: number;
  cover_uri: string | null;
}

export default function CollectionsScreen() {
  const theme = useTheme();
  // Unaliased FROM collections — the cover subquery correlates on
  // `collections.id`. PowerSync's watch sees photos/attachments in the
  // plan, so covers go live the moment a photo lands.
  const { data: collections } = useQuery<CollectionRow>(
    `SELECT collections.*,
       (SELECT COUNT(*) FROM items i WHERE i.collection_id = collections.id) AS item_count,
       ${COLLECTION_COVER_URI_SQL} AS cover_uri
     FROM collections ORDER BY collections.created_at DESC`
  );

  return (
    <ThemedView style={styles.container}>
      <Tabs.Screen
        options={{
          // Header entry point into cross-collection search.
          headerRight: () => (
            <Link href="/search" asChild>
              <Pressable hitSlop={8}>
                <ThemedText type="link">Search</ThemedText>
              </Pressable>
            </Link>
          ),
        }}
      />
      <SyncStatusBar />
      <FlatList
        data={collections}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No collections yet — start one below.
          </ThemedText>
        }
        renderItem={({ item }) => (
          <Link href={`/collection/${item.id}`} asChild>
            {/* Collector's-tray card — raised slate, brass hairline, serif name. */}
            <Pressable
              style={StyleSheet.flatten([
                styles.card,
                { backgroundColor: theme.surfaceRaised, borderColor: theme.hairline },
              ])}
            >
              <View style={styles.cardRow}>
                {/* Auto cover — newest renderable photo across the
                    collection, or the diamond mount when it has none. */}
                <ItemThumb uri={item.cover_uri} size={COVER_SIZE} />
                <View style={styles.cardText}>
                  <ThemedText themeColor="textSecondary" style={Type.label}>
                    {item.vertical}
                  </ThemedText>
                  <ThemedText style={styles.cardName}>{item.name}</ThemedText>
                  <ThemedText themeColor="textSecondary" style={Type.data}>
                    {item.item_count} {item.item_count === 1 ? 'item' : 'items'}
                  </ThemedText>
                </View>
              </View>
            </Pressable>
          </Link>
        )}
      />
      <Link href="/collection/new" asChild>
        <Pressable
          style={StyleSheet.flatten([
            styles.addButton,
            { backgroundColor: theme.accent },
          ])}
        >
          <ThemedText style={styles.buttonText}>+ New Collection</ThemedText>
        </Pressable>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.three, gap: Spacing.three },
  empty: { textAlign: 'center', marginTop: Spacing.six },
  // 8px card radius + 1px hairline per the Estate & Ember system.
  // Padding stepped down to three so the 64px cover sets the row height,
  // matching the item-row density on the collection screen.
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.three,
  },
  // Cover and text share a midline — same tray-row pattern as item rows.
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  cardText: { flex: 1, gap: Spacing.one },
  cardName: { ...Type.title },
  addButton: {
    margin: Spacing.three,
    borderRadius: 8,
    padding: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { ...Type.body, fontFamily: FontFamily.sansSemiBold },
});

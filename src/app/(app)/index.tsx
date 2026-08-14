/**
 * Purpose: Collections screen — live list with item counts, entry point for
 * creating a collection.
 * Author(s): John Reed
 */

import { useQuery } from '@powersync/react';
import { Link, Stack } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { SyncStatusBar } from '@/components/sync-status';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontFamily, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface CollectionRow {
  id: string;
  name: string;
  vertical: string;
  item_count: number;
}

export default function CollectionsScreen() {
  const theme = useTheme();
  const { data: collections } = useQuery<CollectionRow>(
    `SELECT c.*, (SELECT COUNT(*) FROM items i WHERE i.collection_id = c.id) AS item_count
     FROM collections c ORDER BY c.created_at DESC`
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
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
              <View style={styles.cardText}>
                <ThemedText themeColor="textSecondary" style={Type.label}>
                  {item.vertical}
                </ThemedText>
                <ThemedText style={styles.cardName}>{item.name}</ThemedText>
                <ThemedText themeColor="textSecondary" style={Type.data}>
                  {item.item_count} {item.item_count === 1 ? 'item' : 'items'}
                </ThemedText>
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
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.four,
  },
  cardText: { gap: Spacing.one },
  cardName: { ...Type.title },
  addButton: {
    margin: Spacing.three,
    borderRadius: 8,
    padding: Spacing.three,
    alignItems: 'center',
  },
  buttonText: { ...Type.body, fontFamily: FontFamily.sansSemiBold },
});

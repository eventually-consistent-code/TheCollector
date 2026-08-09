/**
 * Purpose: Collections screen — live list with item counts, entry point for
 * creating a collection.
 * Author(s): John Reed
 */

import { useQuery } from '@powersync/react';
import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
            <Pressable
              style={[styles.card, { backgroundColor: theme.backgroundElement }]}
            >
              <View style={styles.cardText}>
                <ThemedText type="subtitle">{item.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.vertical} · {item.item_count}{' '}
                  {item.item_count === 1 ? 'item' : 'items'}
                </ThemedText>
              </View>
            </Pressable>
          </Link>
        )}
      />
      <Link href="/collection/new" asChild>
        <Pressable style={[styles.addButton, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="subtitle">+ New Collection</ThemedText>
        </Pressable>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 12 },
  empty: { textAlign: 'center', marginTop: 48 },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardText: { gap: 4 },
  addButton: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
});

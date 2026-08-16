/**
 * Purpose: Collection picker sheet — the Scan tab asks "scan into which
 * collection?" here. One collection skips the ceremony and goes straight
 * to its scanner; none nudges toward creating a collection first.
 * Author(s): John Reed
 */

import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useCollections } from '@/db/hooks';
import { Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface CollectionPickerProps {
  visible: boolean;
  onClose: () => void;
}

export function CollectionPicker({ visible, onClose }: CollectionPickerProps) {
  const theme = useTheme();
  const router = useRouter();
  const { data: collections } = useCollections();

  const single = collections?.length === 1;

  // Auto-skip: exactly one collection means there is nothing to pick —
  // close and head straight for its scanner.
  useEffect(() => {
    if (visible && single && collections?.[0]) {
      onClose();
      router.push(`/collection/${collections[0].id}/scan`);
    }
  }, [visible, single, collections, onClose, router]);

  // Don't flash the sheet while the auto-skip effect is in flight.
  if (single) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Tap the dim backdrop to dismiss. */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={StyleSheet.flatten([
            styles.sheet,
            { backgroundColor: theme.surfaceRaised, borderColor: theme.hairline },
          ])}
          // Swallow taps inside the sheet so they don't dismiss it.
          onPress={(event) => event.stopPropagation()}
        >
          <ThemedText themeColor="textSecondary" style={styles.heading}>
            Scan into
          </ThemedText>
          {collections?.length ? (
            <FlatList
              data={collections}
              keyExtractor={(c) => c.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                // Collector's-tray row — vertical caps label over the serif name.
                <Pressable
                  style={StyleSheet.flatten([
                    styles.row,
                    { backgroundColor: theme.background, borderColor: theme.hairline },
                  ])}
                  onPress={() => {
                    onClose();
                    router.push(`/collection/${item.id}/scan`);
                  }}
                >
                  <View style={styles.rowText}>
                    <ThemedText themeColor="textSecondary" style={Type.label}>
                      {item.vertical}
                    </ThemedText>
                    <ThemedText style={styles.rowName}>{item.name}</ThemedText>
                  </View>
                </Pressable>
              )}
            />
          ) : (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              No collections yet — create a collection first, then scan into it.
            </ThemedText>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  // Bottom sheet — raised slate, brass hairline across the top edge.
  sheet: {
    maxHeight: '60%',
    borderTopWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: Spacing.four,
    paddingBottom: Spacing.five,
  },
  heading: {
    ...Type.label,
    marginBottom: Spacing.three,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.three,
  },
  rowText: {
    gap: Spacing.half,
  },
  rowName: {
    ...Type.title,
  },
  empty: {
    textAlign: 'center',
    marginVertical: Spacing.four,
  },
});

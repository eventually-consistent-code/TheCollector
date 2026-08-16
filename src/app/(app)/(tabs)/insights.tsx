/**
 * Purpose: Insights tab — a styled forward-promise plaque plus one real stat
 * tile row (vault totals), so the tab earns its place before the charts land
 * with value tracking.
 * Author(s): John Reed
 */

import { StyleSheet, View } from 'react-native';

import { useQuery } from '@powersync/react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Type } from '@/constants/theme';
import { TOTALS_SQL, type TotalsRow } from '@/db/stats';
import { useTheme } from '@/hooks/use-theme';

// Main

export default function InsightsScreen() {
  const theme = useTheme();
  const { data: totals } = useQuery<TotalsRow>(TOTALS_SQL);
  const counts = totals?.[0];

  const card = StyleSheet.flatten([
    styles.card,
    { backgroundColor: theme.surfaceRaised, borderColor: theme.hairline },
  ]);

  return (
    <ThemedView style={styles.container}>
      {/* Serif masthead — the study's voice. */}
      <ThemedText style={styles.masthead}>Insights</ThemedText>

      {/* Real numbers today — live totals across the whole vault. */}
      <View style={styles.tileRow}>
        <View style={StyleSheet.flatten([card, styles.tile])}>
          <ThemedText style={styles.tileNumber}>
            {counts ? String(counts.items) : '—'}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.label}>
            Items
          </ThemedText>
        </View>
        <View style={StyleSheet.flatten([card, styles.tile])}>
          <ThemedText style={styles.tileNumber}>
            {counts ? String(counts.collections) : '—'}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.label}>
            Collections
          </ThemedText>
        </View>
      </View>

      {/* Brass-plaque promise — the charts are coming with value tracking. */}
      <View style={card}>
        <ThemedText themeColor="textSecondary" style={styles.promise}>
          Charts arrive with value tracking.
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  masthead: {
    ...Type.display,
    marginTop: Spacing.two,
  },
  // 8px card radius + 1px brass hairline per the Estate & Ember system.
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.four,
  },
  tileRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  // Big serif number — the tile's whole point.
  tileNumber: { ...Type.title },
  promise: { ...Type.data, textAlign: 'center' },
});

/**
 * Purpose: Allocation by vertical — refined horizontal bars on charcoal
 * tracks, each row direct-labeled (caps label + value) so identity never
 * rides on color alone. Bars over a donut on purpose: honest magnitude
 * comparison, and the study's muted palette reads better as labeled rows
 * than as adjacent pie wedges. Fold math lives in chart-math.ts.
 * Author(s): John Reed
 */

import { StyleSheet, View } from 'react-native';

import { foldAllocation } from '@/components/charts/chart-math';
import { ThemedText } from '@/components/themed-text';
import { Palette, Spacing, Type } from '@/constants/theme';
import { centsToDisplay } from '@/lib/money';

// Constants

// Fixed series order — never cycled. Amber leads (the lamp), hunter felt,
// then two study tints that aren't in Palette proper: sage (hunter lifted
// to read as a fill) and burnished brass (Palette.brass is a border color,
// too deep to survive on a slate card). Muted vellum closes as "Other".
const SERIES = [
  Palette.amber,
  Palette.hunter,
  '#9CAF88', // sage — hunter's daylight tint
  '#8A6D3B', // burnished brass — Palette.brass lifted to fill weight
  Palette.vellumMuted,
] as const;

// Fixed section height per the Insights layout; rows scroll never — five
// slots max by construction (foldAllocation).
const BAR_HEIGHT = 10;

export function AllocationBars({
  rows,
}: {
  rows: readonly { label: string; cents: number }[];
}) {
  const slices = foldAllocation(rows, SERIES.length);

  return (
    <View style={styles.list}>
      {slices.map((slice) => (
        <View key={slice.label} style={styles.row}>
          <View style={styles.labelRow}>
            <View
              style={[styles.swatch, { backgroundColor: SERIES[slice.colorIndex] }]}
            />
            <ThemedText themeColor="textSecondary" style={styles.label}>
              {slice.label}
            </ThemedText>
            <ThemedText style={styles.value}>
              {centsToDisplay(slice.cents)}
            </ThemedText>
          </View>
          {/* Charcoal track recessed into the card; the fill rides frac. */}
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  backgroundColor: SERIES[slice.colorIndex],
                  width: `${Math.max(slice.frac * 100, slice.cents > 0 ? 1 : 0)}%`,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
  },
  row: {
    gap: Spacing.one,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  swatch: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  // Caps label carries identity; the swatch is reinforcement, not the key.
  label: {
    ...Type.label,
    flex: 1,
  },
  value: {
    ...Type.data,
  },
  track: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: Palette.charcoal,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: BAR_HEIGHT / 2,
  },
});

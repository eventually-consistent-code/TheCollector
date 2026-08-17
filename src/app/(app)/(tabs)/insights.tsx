/**
 * Purpose: Insights tab, live — portfolio value line over its history,
 * gain/loss on cost basis, allocation by vertical, top movers, and a
 * 12-month acquisition timeline. Series math is pure (src/lib/value-series),
 * geometry is pure (charts/chart-math); this screen wires rows to ink.
 * Author(s): John Reed
 */

import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useQuery } from '@powersync/react';

import { AllocationBars } from '@/components/charts/allocation-bars';
import { LineChart } from '@/components/charts/line-chart';
import { ItemThumb } from '@/components/item-thumb';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontFamily, Palette, Spacing, Type } from '@/constants/theme';
import {
  useAllValueHistory,
  useItemsValueBaseline,
  useTopMovers,
  useVerticalBreakdown,
} from '@/db/hooks';
import type { TopMoverRow } from '@/db/hooks';
import { TOTALS_SQL, type TotalsRow } from '@/db/stats';
import { useTheme } from '@/hooks/use-theme';
import { centsToDisplay } from '@/lib/money';
import { buildPortfolioSeries, gainLoss, monthBuckets } from '@/lib/value-series';
import { templateFor } from '@/templates';

// Constants

// Gain/loss semantics — not decor, so they live here, not in Palette.
// Up wears the study's amber over a hunter tint; down is a muted red
// that stays in the room's register instead of alarm-red.
const GAIN_TEXT = Palette.amber;
const GAIN_BG = 'rgba(53, 94, 59, 0.35)';
const LOSS_TEXT = '#C0564B';
const LOSS_BG = 'rgba(192, 86, 75, 0.15)';

// Timeline mini-bars — fixed lane height; bars scale within it.
const TIMELINE_HEIGHT = 56;

// The plaque's up/down chip — delta + percent, colored by direction.
function GainLossChip({ deltaCents, pct }: { deltaCents: number; pct: number | null }) {
  const up = deltaCents >= 0;
  const sign = up ? '+' : '−';
  const pctLabel =
    pct !== null ? ` (${sign}${Math.abs(pct * 100).toFixed(1)}%)` : '';
  return (
    <View style={[styles.chip, { backgroundColor: up ? GAIN_BG : LOSS_BG }]}>
      <ThemedText style={[styles.chipText, { color: up ? GAIN_TEXT : LOSS_TEXT }]}>
        {sign}
        {centsToDisplay(Math.abs(deltaCents))}
        {pctLabel}
      </ThemedText>
    </View>
  );
}

// One top-mover row — thumb, serif name, delta on the right, linked home.
function MoverRow({ mover }: { mover: TopMoverRow }) {
  const theme = useTheme();
  const up = mover.delta_cents >= 0;
  return (
    <Link href={`/item/${mover.id}`} asChild>
      <Pressable
        style={StyleSheet.flatten([
          styles.moverRow,
          { backgroundColor: theme.surfaceRaised, borderColor: theme.hairline },
        ])}
      >
        <ItemThumb uri={mover.thumb_uri} size={44} />
        <View style={styles.moverBody}>
          <ThemedText numberOfLines={1} style={styles.moverName}>
            {mover.name}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.data}>
            {centsToDisplay(mover.purchase_price_cents)} {'→'}{' '}
            {centsToDisplay(mover.current_value_cents)}
          </ThemedText>
        </View>
        <ThemedText
          style={[styles.moverDelta, { color: up ? GAIN_TEXT : LOSS_TEXT }]}
        >
          {up ? '+' : '−'}
          {centsToDisplay(Math.abs(mover.delta_cents))}
        </ThemedText>
      </Pressable>
    </Link>
  );
}

// Main

export default function InsightsScreen() {
  const theme = useTheme();
  const { data: totals } = useQuery<TotalsRow>(TOTALS_SQL);
  const { data: historyRows } = useAllValueHistory();
  const { data: baseline } = useItemsValueBaseline();
  const { data: movers } = useTopMovers();
  const { data: breakdown } = useVerticalBreakdown();

  const counts = totals?.[0];

  // Portfolio line + gain/loss, all from the same two row sets.
  const series = buildPortfolioSeries({
    historyRows,
    items: baseline,
    now: Date.now(),
  });
  const valueCents = baseline.reduce(
    (sum, item) => sum + (item.current_value_cents ?? 0),
    0
  );
  const costCents = baseline.reduce(
    (sum, item) => sum + (item.purchase_price_cents ?? 0),
    0
  );
  const gl = gainLoss({ value: valueCents, cost: costCents });

  // Allocation rows wear their template labels; zero-value shelves still show.
  const allocation = breakdown.map((row) => ({
    label: templateFor(row.vertical)?.label ?? row.vertical,
    cents: row.value_cents,
  }));

  const months = monthBuckets(baseline, Date.now());
  const maxMonth = Math.max(...months.map((m) => m.count), 1);

  const card = StyleSheet.flatten([
    styles.card,
    { backgroundColor: theme.surfaceRaised, borderColor: theme.hairline },
  ]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Serif masthead — the study's voice. */}
        <ThemedText style={styles.masthead}>Insights</ThemedText>

        {/* Portfolio value plaque — headline number, gain/loss, the line. */}
        <View style={card}>
          <ThemedText themeColor="textSecondary" style={Type.label}>
            Portfolio Value
          </ThemedText>
          <View style={styles.heroRow}>
            <ThemedText style={styles.heroValue}>
              {centsToDisplay(valueCents)}
            </ThemedText>
            {costCents > 0 ? (
              <GainLossChip deltaCents={gl.deltaCents} pct={gl.pct} />
            ) : null}
          </View>
          {historyRows.length === 0 ? (
            // Baseline-only line under a quiet promise — no history yet.
            <ThemedText themeColor="textSecondary" style={styles.emptyLine}>
              History accrues as values change.
            </ThemedText>
          ) : null}
          <LineChart data={series} />
        </View>

        {/* Live totals across the whole vault. */}
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
          <View style={StyleSheet.flatten([card, styles.tile])}>
            <ThemedText style={styles.tileNumber}>
              {centsToDisplay(costCents)}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={Type.label}>
              Cost Basis
            </ThemedText>
          </View>
        </View>

        {/* Allocation by vertical — labeled bars, largest shelf first. */}
        {allocation.length > 0 ? (
          <View style={card}>
            <ThemedText themeColor="textSecondary" style={styles.sectionLabel}>
              Allocation
            </ThemedText>
            <AllocationBars rows={allocation} />
          </View>
        ) : null}

        {/* Top movers — biggest paper gains, each linked to its item. */}
        {movers.length > 0 ? (
          <View style={styles.section}>
            <ThemedText themeColor="textSecondary" style={styles.sectionLabel}>
              Top Movers
            </ThemedText>
            <View style={styles.moverList}>
              {movers.map((m) => (
                <MoverRow key={m.id} mover={m} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Acquisition timeline — twelve months of catalog cadence. */}
        <View style={card}>
          <ThemedText themeColor="textSecondary" style={styles.sectionLabel}>
            Acquisitions {'—'} Last 12 Months
          </ThemedText>
          <View style={styles.timeline}>
            {months.map((m) => (
              <View key={m.key} style={styles.timelineCol}>
                <View style={styles.timelineLane}>
                  <View
                    style={[
                      styles.timelineBar,
                      {
                        height: Math.max(
                          (m.count / maxMonth) * TIMELINE_HEIGHT,
                          m.count > 0 ? 3 : 1
                        ),
                        backgroundColor:
                          m.count > 0 ? Palette.amber : Palette.brass,
                      },
                    ]}
                  />
                </View>
                <ThemedText themeColor="textSecondary" style={styles.timelineLabel}>
                  {m.label[0]}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
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
    gap: Spacing.two,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  // The headline number — big amber serif, the one lamp in the room.
  heroValue: {
    ...Type.display,
    color: Palette.amber,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  chipText: {
    ...Type.data,
    fontFamily: FontFamily.sansSemiBold,
  },
  emptyLine: {
    ...Type.data,
  },
  tileRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    padding: Spacing.three,
  },
  // Serif number — the tile's whole point, sized to survive three-across.
  tileNumber: {
    fontFamily: FontFamily.serifBold,
    fontSize: 18,
    lineHeight: 24,
  },
  section: {
    gap: Spacing.two,
  },
  sectionLabel: {
    ...Type.label,
  },
  moverList: {
    gap: Spacing.two,
  },
  moverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.three,
  },
  moverBody: {
    flex: 1,
    gap: Spacing.half,
  },
  // Serif small — the collector's-study voice at row density.
  moverName: {
    fontFamily: FontFamily.serif,
    fontSize: 15,
    lineHeight: 20,
  },
  moverDelta: {
    ...Type.data,
    fontFamily: FontFamily.sansSemiBold,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  timelineCol: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  timelineLane: {
    height: TIMELINE_HEIGHT,
    justifyContent: 'flex-end',
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  timelineBar: {
    width: '60%',
    borderRadius: 2,
  },
  timelineLabel: {
    ...Type.data,
    fontSize: 10,
    lineHeight: 12,
  },
});

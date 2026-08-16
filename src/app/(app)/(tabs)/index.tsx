/**
 * Purpose: Dashboard tab — the collector's study at a glance. Serif
 * masthead, portfolio-value plaque, per-vertical shelf grid, and a
 * "Recently Cataloged" rail, with a quiet sync line under it all.
 * Author(s): John Reed
 */

import { useStatus } from '@powersync/react';
import { Link, Tabs } from 'expo-router';
import { FlatList, ScrollView, StyleSheet, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemThumb } from '@/components/item-thumb';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontFamily, Palette, Spacing, Type } from '@/constants/theme';
import {
  useDashboardTotals,
  useRecentItems,
  useVerticalBreakdown,
} from '@/db/hooks';
import type { ItemListRow } from '@/db/hooks';
import { centsToDisplay } from '@/lib/money';
import { templateFor } from '@/templates';
import { useTheme } from '@/hooks/use-theme';

// Constants

// Status semantics, not decor — same dot colors as SyncStatusBar.
const DOT_CONNECTED = '#34A853';
const DOT_OFFLINE = '#9AA0A6';

// Quiet sync line for the dashboard foot — dot + short phrase, no sign-out
// or error plumbing (that stays on SyncStatusBar in The Vault).
function SyncLine() {
  const status = useStatus();

  const syncing =
    status.dataFlowStatus.uploading || status.dataFlowStatus.downloading;
  const label = status.connected
    ? syncing
      ? 'Syncing changes…'
      : 'All changes synced'
    : 'Offline — changes saved locally';
  const color = status.connected ? DOT_CONNECTED : DOT_OFFLINE;

  return (
    <View style={styles.syncLine}>
      <View style={[styles.syncDot, { backgroundColor: color }]} />
      <ThemedText themeColor="textSecondary" style={Type.label}>
        {label}
      </ThemedText>
    </View>
  );
}

// One card on the recently-cataloged rail — thumb, serif name, amber value.
function RecentCard({ item }: { item: ItemListRow }) {
  const theme = useTheme();
  return (
    <Link href={`/item/${item.id}`} asChild>
      <Pressable
        style={StyleSheet.flatten([
          styles.recentCard,
          { backgroundColor: theme.surfaceRaised, borderColor: theme.hairline },
        ])}
      >
        <ItemThumb uri={item.thumb_uri} />
        <ThemedText numberOfLines={1} style={styles.recentName}>
          {item.name}
        </ThemedText>
        {item.current_value_cents != null ? (
          <ThemedText style={styles.recentValue}>
            {centsToDisplay(item.current_value_cents)}
          </ThemedText>
        ) : null}
      </Pressable>
    </Link>
  );
}

export default function DashboardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { data: totalsRows } = useDashboardTotals();
  const { data: breakdown } = useVerticalBreakdown();
  const { data: recent } = useRecentItems();

  const totals = totalsRows[0];
  const itemCount = totals?.item_count ?? 0;
  const verticalCount = breakdown.length;
  const empty = totals !== undefined && itemCount === 0;

  return (
    <ThemedView style={styles.container}>
      {/* In-screen serif masthead instead of the stock tab header. */}
      <Tabs.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={StyleSheet.flatten([
          styles.scroll,
          { paddingTop: insets.top + Spacing.four },
        ])}
      >
        <ThemedText type="title">The Collector</ThemedText>

        {empty ? (
          // Warm invitation — an empty study is a study waiting to begin.
          <View
            style={StyleSheet.flatten([
              styles.hero,
              { backgroundColor: theme.surfaceRaised, borderColor: theme.hairline },
            ])}
          >
            <ThemedText style={styles.emptyTitle}>Begin the archive…</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
              Every collection starts with a single shelf. Catalog your first
              piece and the portfolio takes it from there.
            </ThemedText>
            <Link href="/collection/new" asChild>
              <Pressable hitSlop={8}>
                <ThemedText type="link">Start a collection</ThemedText>
              </Pressable>
            </Link>
          </View>
        ) : (
          <>
            {/* Portfolio hero — the brass-plaque headline number. */}
            <View
              style={StyleSheet.flatten([
                styles.hero,
                { backgroundColor: theme.surfaceRaised, borderColor: theme.hairline },
              ])}
            >
              <ThemedText themeColor="textSecondary" style={Type.label}>
                Portfolio Value
              </ThemedText>
              <ThemedText style={styles.heroValue}>
                {centsToDisplay(totals?.total_value_cents ?? 0)}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={Type.data}>
                {itemCount} {itemCount === 1 ? 'item' : 'items'} across{' '}
                {verticalCount} {verticalCount === 1 ? 'vertical' : 'verticals'}
              </ThemedText>
            </View>

            {/* Per-vertical shelf grid — one small tray card each. */}
            <View style={styles.grid}>
              {breakdown.map((row) => (
                <View
                  key={row.vertical}
                  style={StyleSheet.flatten([
                    styles.gridCard,
                    { backgroundColor: theme.surfaceRaised, borderColor: theme.hairline },
                  ])}
                >
                  <ThemedText themeColor="textSecondary" style={Type.label}>
                    {templateFor(row.vertical)?.label ?? row.vertical}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={Type.data}>
                    {row.item_count} {row.item_count === 1 ? 'item' : 'items'}
                  </ThemedText>
                  <ThemedText style={styles.gridValue}>
                    {centsToDisplay(row.value_cents)}
                  </ThemedText>
                </View>
              ))}
            </View>

            <ThemedText type="subtitle" style={styles.sectionHeader}>
              Recently Cataloged
            </ThemedText>
            <FlatList
              horizontal
              data={recent}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <RecentCard item={item} />}
              contentContainerStyle={styles.recentRail}
              showsHorizontalScrollIndicator={false}
            />
          </>
        )}
      </ScrollView>
      <SyncLine />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  // 8px radius + brass hairline — the Estate & Ember plaque treatment.
  hero: {
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  // The headline number — big amber serif, the one lamp in the room.
  heroValue: {
    ...Type.display,
    color: Palette.amber,
  },
  emptyTitle: { ...Type.title },
  emptyBody: { ...Type.body },
  // Two-across tray cards; 48% + space-between keeps the gutter honest.
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.three,
  },
  gridCard: {
    width: '48%',
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  gridValue: {
    ...Type.data,
    fontFamily: FontFamily.sansSemiBold,
    color: Palette.amber,
  },
  sectionHeader: {
    marginTop: Spacing.two,
  },
  recentRail: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  recentCard: {
    width: 120,
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  // Serif small — the collector's-study voice at row density.
  recentName: {
    fontFamily: FontFamily.serif,
    fontSize: 14,
    lineHeight: 20,
  },
  recentValue: {
    ...Type.data,
    color: Palette.amber,
  },
  syncLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: Palette.slate,
    borderTopWidth: 1,
    borderTopColor: Palette.brass,
  },
  syncDot: { width: 8, height: 8, borderRadius: 4 },
});

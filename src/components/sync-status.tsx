/**
 * Purpose: Sync status row — connection dot + label + sign-out. Lives at the
 * top of the collections screen, styled as a quiet brass-trimmed plaque.
 * Author(s): John Reed
 */

import { usePowerSync, useStatus } from '@powersync/react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Spacing, Type } from '@/constants/theme';
import { signOutAndClear } from '@/db/sync';

// Status semantics, not Estate & Ember decor — green means healthy sync and
// gray means offline on any theme, so these stay out of the palette.
const DOT_CONNECTED = '#34A853';
const DOT_OFFLINE = '#9AA0A6';

export function SyncStatusBar() {
  const db = usePowerSync();
  const status = useStatus();

  const label = status.connected
    ? status.dataFlowStatus.uploading || status.dataFlowStatus.downloading
      ? 'syncing…'
      : 'synced'
    : 'offline';
  const color = status.connected ? DOT_CONNECTED : DOT_OFFLINE;

  const err =
    status.dataFlowStatus.downloadError ?? status.dataFlowStatus.uploadError;

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText themeColor="textSecondary" style={[Type.label, styles.label]}>
        {label}
        {err ? ` — ${String(err).slice(0, 120)}` : ''}
      </ThemedText>
      <Pressable hitSlop={8} onPress={() => signOutAndClear(db)}>
        <ThemedText themeColor="textSecondary" style={Type.label}>
          Sign out
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Quiet plaque strip — raised slate with a brass hairline across the top.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
    backgroundColor: Palette.slate,
    borderTopWidth: 1,
    borderTopColor: Palette.brass,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { flex: 1 },
});

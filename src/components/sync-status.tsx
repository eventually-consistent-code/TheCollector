/**
 * Purpose: Sync status row — connection dot + label + sign-out. Lives at the
 * top of the collections screen.
 * Author(s): John Reed
 */

import { usePowerSync, useStatus } from '@powersync/react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { signOutAndClear } from '@/db/sync';

export function SyncStatusBar() {
  const db = usePowerSync();
  const status = useStatus();

  const label = status.connected
    ? status.dataFlowStatus.uploading || status.dataFlowStatus.downloading
      ? 'syncing…'
      : 'synced'
    : 'offline';
  const color = status.connected ? '#34A853' : '#9AA0A6';

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
        {label}
      </ThemedText>
      <Pressable onPress={() => signOutAndClear(db)}>
        <ThemedText type="small" themeColor="textSecondary">
          Sign out
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { flex: 1 },
});

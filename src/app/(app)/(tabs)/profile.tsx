/**
 * Purpose: Profile tab — account plaque, live sync card with vault totals,
 * app version, and the sign-out ghost button (two-tap confirm, works on
 * native and web alike).
 * Author(s): John Reed
 */

import Constants from 'expo-constants';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { usePowerSync, useQuery, useStatus } from '@powersync/react';

import { useSession } from '@/auth/session';
import { DOT_CONNECTED, DOT_OFFLINE } from '@/components/sync-status';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Palette, Spacing, Type } from '@/constants/theme';
import { TOTALS_SQL, type TotalsRow } from '@/db/stats';
import { signOutAndClear } from '@/db/sync';
import { useTheme } from '@/hooks/use-theme';

// Constants

// How long the "tap again" arm stays hot before quietly standing down.
const CONFIRM_WINDOW_MS = 3500;

// Main

export default function ProfileScreen() {
  const theme = useTheme();
  const db = usePowerSync();
  const status = useStatus();
  const { session } = useSession();
  const { data: totals } = useQuery<TotalsRow>(TOTALS_SQL);

  // Two-tap sign-out — first tap arms, second tap fires. Works everywhere
  // (RN Alert has no web story), and the arm disarms itself after a beat.
  const [confirming, setConfirming] = useState(false);
  const disarmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (disarmTimer.current) clearTimeout(disarmTimer.current);
    };
  }, []);

  const onSignOutPress = () => {
    if (!confirming) {
      setConfirming(true);
      disarmTimer.current = setTimeout(
        () => setConfirming(false),
        CONFIRM_WINDOW_MS
      );
      return;
    }
    if (disarmTimer.current) clearTimeout(disarmTimer.current);
    signOutAndClear(db);
  };

  // Live sync state — same semantics (and dot colors) as the Vault bar.
  const syncing =
    status.dataFlowStatus.uploading || status.dataFlowStatus.downloading;
  const syncLabel = status.connected
    ? syncing
      ? 'Syncing'
      : 'Connected'
    : 'Offline';
  const dotColor = status.connected ? DOT_CONNECTED : DOT_OFFLINE;
  const syncErr =
    status.dataFlowStatus.downloadError ?? status.dataFlowStatus.uploadError;

  const counts = totals?.[0];
  const version = Constants.expoConfig?.version ?? '0.0.0';

  const card = StyleSheet.flatten([
    styles.card,
    { backgroundColor: theme.surfaceRaised, borderColor: theme.hairline },
  ]);

  return (
    <ThemedView style={styles.container}>
      {/* Account plaque — the collector's nameplate on the study door. */}
      <View style={card}>
        <ThemedText themeColor="textSecondary" style={Type.label}>
          Account
        </ThemedText>
        <ThemedText style={styles.email}>
          {session?.user.email ?? 'Signed in'}
        </ThemedText>
      </View>

      {/* Sync card — live state plus what the vault holds. */}
      <View style={card}>
        <ThemedText themeColor="textSecondary" style={Type.label}>
          Sync
        </ThemedText>
        <View style={styles.syncRow}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <ThemedText style={Type.data}>{syncLabel}</ThemedText>
        </View>
        {syncErr ? (
          <ThemedText themeColor="textSecondary" style={Type.data}>
            {String(syncErr).slice(0, 120)}
          </ThemedText>
        ) : null}
        <ThemedText themeColor="textSecondary" style={Type.data}>
          {counts
            ? `${counts.collections} ${
                counts.collections === 1 ? 'collection' : 'collections'
              } · ${counts.items} ${counts.items === 1 ? 'item' : 'items'}`
            : '…'}
        </ThemedText>
      </View>

      <View style={styles.footer}>
        {/* Brass-outline ghost button — goes amber once armed. */}
        <Pressable
          onPress={onSignOutPress}
          style={StyleSheet.flatten([
            styles.signOut,
            { borderColor: confirming ? Palette.amber : theme.hairline },
          ])}
        >
          <ThemedText
            style={StyleSheet.flatten([
              styles.signOutText,
              confirming && { color: Palette.amber },
            ])}
          >
            {confirming ? 'Tap again to sign out' : 'Sign out'}
          </ThemedText>
        </Pressable>
        <ThemedText themeColor="textSecondary" style={styles.version}>
          The Collector v{version}
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
  // 8px card radius + 1px brass hairline per the Estate & Ember system.
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  // The email in the study's serif voice.
  email: { ...Type.title },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  footer: {
    marginTop: 'auto',
    gap: Spacing.three,
    alignItems: 'center',
  },
  signOut: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.three,
    alignItems: 'center',
  },
  signOutText: { ...Type.data },
  version: { ...Type.data, fontSize: 12, lineHeight: 16 },
});

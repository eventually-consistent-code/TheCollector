/**
 * Purpose: Scan-to-add — camera barcode scan (or manual entry) → metadata
 * lookup → result picker → new-item form prefilled. Web camera scanning
 * only exists where the browser has BarcodeDetector (Chromium); manual
 * entry is the universal fallback everywhere.
 * Author(s): John Reed
 */

import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ActionButton, Field } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontFamily, Palette, Type } from '@/constants/theme';
import { useCollection } from '@/db/hooks';
import { useTheme } from '@/hooks/use-theme';
import {
  MetadataProxyError,
  SCAN_BARCODE_TYPES,
  scanLookup,
  type MetadataResult,
} from '@/metadata';
import { canCameraScan } from '@/metadata/scan-support';
import { templateFor } from '@/templates';

// Constants

// Chromium ships BarcodeDetector; Safari/Firefox do not — no camera scanning
// there, manual entry carries the day.
const WEB_CAN_SCAN = canCameraScan(
  Platform.OS,
  typeof window !== 'undefined' ? window : undefined
);

// Vignette bands — rgba() of Palette.charcoal (#121212 → 18,18,18). A real
// gradient wants expo-linear-gradient, which isn't a dep; three stacked
// bands of falling opacity read the same at a glance.
const VIGNETTE_STRONG = 'rgba(18, 18, 18, 0.55)';
const VIGNETTE_MID = 'rgba(18, 18, 18, 0.35)';
const VIGNETTE_SOFT = 'rgba(18, 18, 18, 0.15)';

type ScanState =
  | { stage: 'scanning' }
  | { stage: 'looking'; barcode: string }
  | { stage: 'results'; results: MetadataResult[]; bridgeTitle?: string }
  | { stage: 'miss'; bridgeTitle?: string }
  | { stage: 'error'; message: string };

// Brass-outline ghost button — the card's quiet secondary action.
function GhostButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.ghostButton}>
      <ThemedText style={styles.ghostLabel}>{title}</ThemedText>
    </Pressable>
  );
}

// Footer microcopy shared by every result card.
function SyncNote() {
  return (
    <ThemedText themeColor="textSecondary" style={styles.syncNote}>
      Saves instantly — syncs when online
    </ThemedText>
  );
}

export default function ScanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { data: collectionRows } = useCollection(id);
  const template = templateFor(collectionRows?.[0]?.vertical);
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ScanState>({ stage: 'scanning' });
  const [manualCode, setManualCode] = useState('');
  // One lookup per scan session — CameraView fires repeatedly on a held frame.
  const lockRef = useRef(false);

  const openForm = (name?: string, fields?: MetadataResult['fields']) => {
    const prefill = encodeURIComponent(JSON.stringify({ name, customFields: fields }));
    router.replace(`/collection/${id}/new-item?prefill=${prefill}`);
  };

  const handleBarcode = async (data: string, type: string) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setState({ stage: 'looking', barcode: data });

    try {
      const outcome = await scanLookup(template.id, data, type);
      if (outcome.results.length > 0) {
        setState({ stage: 'results', results: outcome.results, bridgeTitle: outcome.bridgeTitle });
      } else {
        setState({ stage: 'miss', bridgeTitle: outcome.bridgeTitle });
      }
    } catch (error) {
      const message =
        error instanceof MetadataProxyError ? error.message : 'lookup failed — try again';
      setState({ stage: 'error', message });
    }
  };

  const rescan = () => {
    lockRef.current = false;
    setState({ stage: 'scanning' });
  };

  const cameraAllowed = WEB_CAN_SCAN && permission?.granted;

  // Result cards share one language: deep slate, brass hairline, 12px radius.
  const cardStyle = StyleSheet.flatten([
    styles.card,
    { backgroundColor: theme.surfaceRaised, borderColor: theme.hairline },
  ]);

  return (
    <ThemedView style={styles.container}>
      {/* Serif title floats over the live camera; opaque header elsewhere. */}
      <Stack.Screen
        options={{
          title: 'Catalog an Item',
          headerTransparent: state.stage === 'scanning' && !!cameraAllowed,
          headerTintColor: Palette.vellum,
          headerTitleStyle: { fontFamily: FontFamily.serifBold, color: Palette.vellum },
        }}
      />

      {state.stage === 'scanning' && (
        <>
          {cameraAllowed ? (
            <View style={styles.cameraWrap}>
              <CameraView
                style={StyleSheet.absoluteFill}
                barcodeScannerSettings={{ barcodeTypes: [...SCAN_BARCODE_TYPES] }}
                onBarcodeScanned={({ data, type }) => handleBarcode(data, type)}
              />
              {/* Charcoal vignettes + gold-frame viewfinder — display only. */}
              <View pointerEvents="none" style={styles.overlay}>
                <View>
                  <View style={[styles.band, { backgroundColor: VIGNETTE_STRONG }]} />
                  <View style={[styles.band, { backgroundColor: VIGNETTE_MID }]} />
                  <View style={[styles.band, { backgroundColor: VIGNETTE_SOFT }]} />
                </View>
                <View style={styles.viewfinderZone}>
                  <View style={styles.frame}>
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />
                  </View>
                  <ThemedText themeColor="textSecondary" style={styles.frameCaption}>
                    Align barcode or item
                  </ThemedText>
                </View>
                <View>
                  <View style={[styles.band, { backgroundColor: VIGNETTE_SOFT }]} />
                  <View style={[styles.band, { backgroundColor: VIGNETTE_MID }]} />
                  <View style={[styles.band, { backgroundColor: VIGNETTE_STRONG }]} />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.cameraFallback}>
              {WEB_CAN_SCAN ? (
                <>
                  <ThemedText themeColor="textSecondary" style={styles.centerText}>
                    Camera permission needed to scan barcodes.
                  </ThemedText>
                  <ActionButton title="Allow Camera" onPress={requestPermission} />
                </>
              ) : (
                <ThemedText themeColor="textSecondary" style={styles.centerText}>
                  This browser cannot scan barcodes — enter the number below.
                </ThemedText>
              )}
            </View>
          )}
          <View style={[styles.manual, { borderTopColor: theme.hairline }]}>
            <Field
              label="Or enter the barcode"
              value={manualCode}
              onChangeText={setManualCode}
              keyboardType="number-pad"
              placeholder="036000291452"
            />
            <ActionButton
              title="Look Up"
              onPress={() => handleBarcode(manualCode.trim(), 'manual')}
              disabled={!manualCode.trim()}
            />
          </View>
        </>
      )}

      {state.stage === 'looking' && (
        <View style={styles.cameraFallback}>
          <ActivityIndicator color={Palette.amber} />
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            Looking up {state.barcode}…
          </ThemedText>
        </View>
      )}

      {state.stage === 'results' && (
        <View style={styles.sheetZone}>
          <View style={[cardStyle, styles.resultsCard]}>
            <FlatList
              data={state.results}
              keyExtractor={(_, index) => String(index)}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => (
                <View style={[styles.rowDivider, { backgroundColor: theme.hairline }]} />
              )}
              ListHeaderComponent={
                <ThemedText style={styles.matchLabel}>Match Found</ThemedText>
              }
              renderItem={({ item }) => (
                <Pressable style={styles.resultRow} onPress={() => openForm(item.title, item.fields)}>
                  <ThemedText style={styles.resultTitle}>{item.title}</ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.resultDetail}>
                    {[item.subtitle, item.source].filter(Boolean).join(' · ')}
                  </ThemedText>
                </Pressable>
              )}
              ListFooterComponent={
                <View style={styles.footerActions}>
                  <ActionButton title="None of these — enter manually" onPress={() => openForm(state.bridgeTitle)} />
                  <GhostButton title="Scan Again" onPress={rescan} />
                  <SyncNote />
                </View>
              }
            />
          </View>
        </View>
      )}

      {(state.stage === 'miss' || state.stage === 'error') && (
        <View style={styles.sheetZone}>
          <View style={cardStyle}>
            <ThemedText style={styles.matchLabel}>
              {state.stage === 'miss' ? 'No Match' : 'Lookup Trouble'}
            </ThemedText>
            <ThemedText style={styles.cardMessage}>
              {state.stage === 'miss'
                ? state.bridgeTitle
                  ? `Found "${state.bridgeTitle}" but no ${template.label} match.`
                  : 'No match for that barcode.'
                : state.message}
            </ThemedText>
            <ActionButton
              title="Add Manually"
              onPress={() => openForm(state.stage === 'miss' ? state.bridgeTitle : undefined)}
            />
            <GhostButton title="Scan Again" onPress={rescan} />
            <SyncNote />
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cameraWrap: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  band: { height: 36 },
  viewfinderZone: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Picture-frame corners — thin amber strokes, not a chunky QR box.
  frame: { width: 240, height: 240 },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: Palette.amber,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
  frameCaption: { ...Type.data, marginTop: 16, textAlign: 'center' },
  cameraFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  centerText: { ...Type.body, textAlign: 'center' },
  manual: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  // Bottom-anchored result sheet.
  sheetZone: { flex: 1, justifyContent: 'flex-end', padding: 16 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  resultsCard: { maxHeight: '75%' },
  list: { paddingBottom: 4 },
  matchLabel: { ...Type.label, color: Palette.amber, marginBottom: 12 },
  resultRow: { paddingVertical: 12, gap: 4 },
  rowDivider: { height: StyleSheet.hairlineWidth },
  resultTitle: { fontFamily: FontFamily.serifBold, fontSize: 18, lineHeight: 24 },
  resultDetail: { ...Type.data },
  cardMessage: { ...Type.body, marginBottom: 16 },
  footerActions: { marginTop: 16 },
  ghostButton: {
    borderWidth: 1,
    borderColor: Palette.brass,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  ghostLabel: { fontFamily: FontFamily.sansMedium, fontSize: 16, lineHeight: 24 },
  syncNote: { fontFamily: FontFamily.sans, fontSize: 12, lineHeight: 16, textAlign: 'center' },
});

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

type ScanState =
  | { stage: 'scanning' }
  | { stage: 'looking'; barcode: string }
  | { stage: 'results'; results: MetadataResult[]; bridgeTitle?: string }
  | { stage: 'miss'; bridgeTitle?: string }
  | { stage: 'error'; message: string };

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

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Scan to Add' }} />

      {state.stage === 'scanning' && (
        <>
          {cameraAllowed ? (
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: [...SCAN_BARCODE_TYPES] }}
              onBarcodeScanned={({ data, type }) => handleBarcode(data, type)}
            />
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
          <View style={styles.manual}>
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
          <ActivityIndicator />
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            Looking up {state.barcode}…
          </ThemedText>
        </View>
      )}

      {state.stage === 'results' && (
        <FlatList
          data={state.results}
          keyExtractor={(_, index) => String(index)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <ThemedText type="subtitle" style={styles.listHeader}>
              Pick a match
            </ThemedText>
          }
          renderItem={({ item }) => (
            <Pressable
              style={StyleSheet.flatten([styles.card, { backgroundColor: theme.backgroundElement }])}
              onPress={() => openForm(item.title, item.fields)}
            >
              <ThemedText type="subtitle">{item.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {[item.subtitle, item.source].filter(Boolean).join(' · ')}
              </ThemedText>
            </Pressable>
          )}
          ListFooterComponent={
            <View style={styles.footerActions}>
              <ActionButton title="None of these — enter manually" onPress={() => openForm(state.bridgeTitle)} />
              <ActionButton title="Scan Again" onPress={rescan} />
            </View>
          }
        />
      )}

      {(state.stage === 'miss' || state.stage === 'error') && (
        <View style={styles.cameraFallback}>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
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
          <ActionButton title="Scan Again" onPress={rescan} />
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  cameraFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  centerText: { textAlign: 'center' },
  manual: { padding: 16 },
  list: { padding: 16 },
  listHeader: { marginBottom: 12 },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 4,
  },
  footerActions: { marginTop: 8 },
});

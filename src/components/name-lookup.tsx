/**
 * Purpose: Type-ahead lookup UI for the add-item name field — a react hook
 * around the pure typeahead controller, and the pop-over that hangs under
 * the field: tray-card suggestion rows, a spinner while searching, a muted
 * hint when a source is degraded. The form owns the field itself; this
 * never traps focus.
 * Author(s): John Reed
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Palette, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MetadataAdapter, MetadataResult } from '@/metadata';
import {
  createTypeahead,
  type TypeaheadController,
  type TypeaheadState,
} from '@/metadata/typeahead';

// Constants

// Five rows and change — anything longer scrolls inside the popover.
const POPOVER_MAX_HEIGHT = 300;
const THUMB_SIZE = 32;

// Hook — owns the controller lifecycle; rebuilt if the adapter arrives late
// (the collection row loads async, so the vertical can resolve after the
// first render).
export function useNameLookup(adapter: MetadataAdapter | undefined, enabled: boolean) {
  const [state, setState] = useState<TypeaheadState>({ kind: 'idle' });
  const controllerRef = useRef<TypeaheadController | null>(null);

  useEffect(() => {
    const controller = createTypeahead({ adapter, enabled, onState: setState });
    controllerRef.current = controller;
    return () => {
      controllerRef.current = null;
      controller.dispose();
    };
  }, [adapter, enabled]);

  const setQuery = useCallback((raw: string) => controllerRef.current?.setQuery(raw), []);
  const dismiss = useCallback(() => controllerRef.current?.dismiss(), []);

  return {
    state,
    open: state.kind !== 'idle',
    setQuery,
    dismiss,
  };
}

// One suggestion — thumb when the source has art, serif title, muted detail.
function SuggestionRow({
  result,
  onPick,
}: {
  result: MetadataResult;
  onPick: (result: MetadataResult) => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={() => onPick(result)} style={styles.row}>
      {result.imageUrl ? (
        <Image
          source={{ uri: result.imageUrl }}
          style={[styles.thumb, { borderColor: theme.hairline }]}
        />
      ) : null}
      <View style={styles.rowText}>
        <ThemedText style={styles.rowTitle} numberOfLines={1}>
          {result.title}
        </ThemedText>
        {result.subtitle ? (
          <ThemedText themeColor="textSecondary" style={styles.rowDetail} numberOfLines={1}>
            {result.subtitle}
          </ThemedText>
        ) : null}
        {result.source ? (
          <ThemedText themeColor="textSecondary" style={styles.rowSource}>
            {result.source}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

// Main

// The popover itself — render it directly under the name field inside a
// relatively-positioned wrapper. Purely presentational; state comes from
// useNameLookup.
export function NameLookupPopover({
  state,
  onPick,
}: {
  state: TypeaheadState;
  onPick: (result: MetadataResult) => void;
}) {
  const theme = useTheme();

  if (state.kind === 'idle') {
    return null;
  }

  return (
    <View
      style={[
        styles.popover,
        { backgroundColor: theme.surfaceRaised, borderColor: theme.hairline },
      ]}
    >
      {state.kind === 'loading' && (
        <View style={styles.hintRow}>
          <ActivityIndicator size="small" color={Palette.amber} />
          <ThemedText themeColor="textSecondary" style={styles.hintText}>
            searching…
          </ThemedText>
        </View>
      )}

      {state.kind === 'hint' && (
        <View style={styles.hintRow}>
          <ThemedText themeColor="textSecondary" style={styles.hintText}>
            {state.message}
          </ThemedText>
        </View>
      )}

      {state.kind === 'results' && (
        <ScrollView
          style={{ maxHeight: POPOVER_MAX_HEIGHT }}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {state.results.map((result, index) => (
            <View key={`${result.source}-${result.title}-${index}`}>
              {index > 0 && (
                <View style={[styles.divider, { backgroundColor: theme.hairline }]} />
              )}
              <SuggestionRow result={result} onPick={onPick} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // In normal layout flow directly under the field — an absolute overhang
  // renders outside the anchor's frame and iOS refuses to deliver touches
  // there (every row tap fell through to the dismiss backdrop). In-flow,
  // the open list pushes the form down and taps land. trace-e5ba6226.
  popover: {
    marginTop: -8, // tuck under the field's own bottom margin
    marginBottom: Spacing.four,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowText: { flex: 1, gap: 2 },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { fontFamily: FontFamily.serifBold, fontSize: 16, lineHeight: 22 },
  rowDetail: { ...Type.data },
  rowSource: { fontFamily: FontFamily.sans, fontSize: 11, lineHeight: 14 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  hintText: { ...Type.data, flexShrink: 1 },
});

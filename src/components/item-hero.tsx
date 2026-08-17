/**
 * Purpose: Item hero — the photo leads, ledger follows. One photo renders a
 * large letterboxed plate; several page horizontally with dot indicators;
 * none shows the empty display mount. A compact ghost-button row underneath
 * handles add/remove, riding the same useItemPhotos core as PhotoSection.
 * Author(s): John Reed
 */

import { useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ItemPhoto } from '@/components/item-photo';
import { ThemedText } from '@/components/themed-text';
// Deep-slate letterbox, brass hairline frame, one amber dot for the lamp.
import { Palette, Spacing } from '@/constants/theme';
import { useItemPhotos } from '@/hooks/use-item-photos';

// Constants

// Letterbox height — tall enough for a card slab, short enough that the
// ledger still peeks above the fold.
export const HERO_HEIGHT = 320;

//*************************************************************************
// Pure — paging math
//*************************************************************************

// Which page the scroll offset has settled on, clamped to the real photo
// count so momentum overshoot never lights a dot that does not exist.
export function heroPageFromOffset(
  offsetX: number,
  pageWidth: number,
  count: number
): number {
  if (pageWidth <= 0 || count <= 0) {
    return 0;
  }
  const page = Math.round(offsetX / pageWidth);
  return Math.min(Math.max(page, 0), count - 1);
}

//*************************************************************************
// Hero
//*************************************************************************

export function ItemHero({ itemId, userId }: { itemId: string; userId: string }) {
  const { photos, busy, armedDelete, addFromLibrary, addFromCamera, onPhotoPress } =
    useItemPhotos(itemId, userId);
  const [page, setPage] = useState(0);
  const [width, setWidth] = useState(0);

  const count = photos?.length ?? 0;
  // Momentum can leave `page` pointing past the end right after a delete —
  // clamp before indexing so the remove button always has a live target.
  const current = photos?.[Math.min(page, Math.max(count - 1, 0))];

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(heroPageFromOffset(e.nativeEvent.contentOffset.x, width, count));
  };

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      testID="item-hero"
    >
      {count === 0 && (
        // Empty display mount at hero scale — same diamond the list thumbs
        // use, writ large, with a quiet nudge toward the first photo.
        <View style={[styles.card, styles.placeholder]} testID="item-hero-placeholder">
          <View style={styles.diamond} />
          <ThemedText type="small" themeColor="textSecondary">
            Add a photo
          </ThemedText>
        </View>
      )}

      {count === 1 && (
        <View style={styles.card} testID="item-hero-single">
          <ItemPhoto localUri={photos![0].local_uri} fill contentFit="contain" />
        </View>
      )}

      {count > 1 && width > 0 && (
        <FlatList
          data={photos}
          keyExtractor={(p) => p.id}
          horizontal
          pagingEnabled
          snapToInterval={width}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={32}
          testID="item-hero-pager"
          renderItem={({ item }) => (
            <View style={{ width }}>
              <View style={styles.card}>
                <ItemPhoto localUri={item.local_uri} fill contentFit="contain" />
              </View>
            </View>
          )}
        />
      )}

      {count > 1 && (
        <View style={styles.dots} testID="item-hero-dots">
          {photos!.map((p, i) => (
            <View key={p.id} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
      )}

      {/* Compact management row — brass-outline ghosts, no heavy buttons.
          Remove targets the photo currently on the plate, two taps to
          commit, same arming dance as the grid. */}
      <View style={styles.row}>
        <GhostButton
          title={busy ? 'Adding…' : '+ Add Photo'}
          onPress={addFromLibrary}
          disabled={busy}
        />
        {Platform.OS !== 'web' && (
          <GhostButton
            title={busy ? 'Adding…' : '+ Camera'}
            onPress={addFromCamera}
            disabled={busy}
          />
        )}
        {current && (
          <GhostButton
            title={armedDelete === current.id ? 'Really remove?' : 'Remove'}
            onPress={() => onPhotoPress(current.id)}
            armed={armedDelete === current.id}
          />
        )}
      </View>
    </View>
  );
}

//*************************************************************************
// Ghost button — brass outline, quiet until armed
//*************************************************************************

function GhostButton({
  title,
  onPress,
  disabled,
  armed,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  armed?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.ghost,
        armed && styles.ghostArmed,
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      <ThemedText type="small" style={armed ? styles.ghostArmedText : undefined}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.three },
  // Deep-slate letterbox in a 1px brass hairline, 12px radius. Side margins
  // come from the form's own Spacing.three content padding — adding more
  // here would double them up.
  card: {
    height: HERO_HEIGHT,
    backgroundColor: Palette.slate,
    borderWidth: 1,
    borderColor: Palette.brass,
    borderRadius: 12,
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  // The list-thumb diamond scaled up to hero size — still faint, still calm.
  diamond: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: Palette.vellumMuted,
    opacity: 0.5,
    transform: [{ rotate: '45deg' }],
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.vellumMuted,
    opacity: 0.5,
  },
  // The lamp lands on the active page.
  dotActive: { backgroundColor: Palette.amber, opacity: 1 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  ghost: {
    borderWidth: 1,
    borderColor: Palette.brass,
    borderRadius: 8,
    paddingVertical: Spacing.one + Spacing.half,
    paddingHorizontal: Spacing.three,
  },
  // Armed remove goes error-red — a warning, not a palette moment.
  ghostArmed: { borderColor: '#D93025' },
  ghostArmedText: { color: '#D93025' },
});

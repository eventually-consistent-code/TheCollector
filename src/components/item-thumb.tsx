/**
 * Purpose: Small square thumbnail for list rows — the item's first photo in
 * a brass hairline frame, or a quiet monogram-diamond placeholder when the
 * item has no renderable photo yet. Rendering rides ItemPhoto, so the
 * native-vs-web uri handling lives in exactly one place.
 * Author(s): John Reed
 */

import { StyleSheet, View } from 'react-native';

import { ItemPhoto } from '@/components/item-photo';
import { Palette } from '@/constants/theme';

// Constants

// Row-scale thumbnail — small enough to keep the tray cards compact.
export const THUMB_SIZE = 60;

export function ItemThumb({
  uri,
  size = THUMB_SIZE,
}: {
  uri: string | null;
  // Frame edge in px — defaults to row scale; the Vault's collection
  // covers step it up a notch without a second component.
  size?: number;
}) {
  const frameSize = { width: size, height: size };

  if (!uri) {
    // No photo (or none renderable yet): a deep recess in the card with a
    // faint bordered diamond — an empty display mount, not an error.
    return (
      <View
        style={[styles.frame, styles.placeholder, frameSize]}
        testID="item-thumb-placeholder"
      >
        <View style={styles.diamond} />
      </View>
    );
  }

  return (
    <View style={[styles.frame, frameSize]} testID="item-thumb-photo">
      {/* Inner photo sized to the frame's content box; the frame's 8px
          radius + overflow hidden clips the image corners to match. */}
      <ItemPhoto localUri={uri} size={size - 2} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Thin brass frame, 8px radius — same framed-plate treatment as the
  // item screen's photo grid, scaled down to row density. Width/height
  // ride the size prop at render time.
  frame: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.brass,
    overflow: 'hidden',
  },
  // Charcoal reads a step deeper than the slate card it sits on.
  placeholder: {
    backgroundColor: Palette.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diamond: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: Palette.vellumMuted,
    opacity: 0.5,
    transform: [{ rotate: '45deg' }],
  },
});

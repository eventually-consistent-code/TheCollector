/**
 * Purpose: Author presence for the book form — a small monogram medallion
 * beside the author field. Serif initials in a brass-ringed circle when we
 * have a name, the same quiet bordered diamond ItemThumb uses when we don't.
 * Placeholder-only for now: the books search payload carries no author OLID,
 * so there is no cheap live photo to fetch yet.
 * Author(s): John Reed
 */

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Palette } from '@/constants/theme';

// Constants

// Medallion diameter — sized to sit flush beside a form input row.
export const AUTHOR_BADGE_SIZE = 44;

/**
 * First letters of the first two words, uppercased — "J.R.R. Tolkien"
 * becomes "JT", a single word gives one letter, anything blank gives ''.
 * First letter means first code point, so unicode names keep their mark.
 *
 * :param name: author name as typed (or empty/undefined)
 * :returns: 0–2 character monogram string
 */
export function authorInitials(name: string | undefined | null): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);

  return words
    .slice(0, 2)
    .map((w) => [...w][0].toLocaleUpperCase())
    .join('');
}

export function AuthorBadge({ name }: { name?: string | null }) {
  const initials = authorInitials(name);

  if (initials === '') {
    // No author yet: the empty display mount — muted diamond, dimmer ring.
    return (
      <View style={[styles.circle, styles.empty]} testID="author-badge-empty">
        <View style={styles.diamond} />
      </View>
    );
  }

  return (
    <View style={styles.circle} testID="author-badge-monogram">
      <ThemedText style={styles.initials}>{initials}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  // Deep-slate fill under a 1px brass hairline — the same framed-plate
  // treatment as ItemThumb, rounded to a full circle.
  circle: {
    width: AUTHOR_BADGE_SIZE,
    height: AUTHOR_BADGE_SIZE,
    borderRadius: AUTHOR_BADGE_SIZE / 2,
    borderWidth: 1,
    borderColor: Palette.brass,
    backgroundColor: Palette.slate,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Serif monogram in vellum — the collector's-study voice at plate scale.
  initials: {
    fontFamily: FontFamily.serifBold,
    fontSize: 16,
    lineHeight: 20,
    color: Palette.vellum,
  },
  empty: {
    opacity: 0.6,
  },
  diamond: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: Palette.vellumMuted,
    opacity: 0.5,
    transform: [{ rotate: '45deg' }],
  },
});

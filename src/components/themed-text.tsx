/**
 * Purpose: Themed text — every text role mapped onto the Estate & Ember
 * type scale. Serif (Libre Caslon) for title/subtitle, Geist for body and
 * data. Weight comes from the loaded per-weight families, not fontWeight —
 * numeric weights on top of a loaded family break the swap on Android.
 * Author(s): John Reed
 */

import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { FontFamily, Fonts, Palette, ThemeColor, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  // Geist data voice — small supporting text.
  small: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    lineHeight: 20,
  },
  // Geist body — the default reading voice.
  default: {
    ...Type.body,
  },
  // Serif display/title — the collector's-study voice.
  title: {
    ...Type.display,
  },
  subtitle: {
    ...Type.title,
  },
  // Links read amber — the one lamp in the room.
  link: {
    fontFamily: FontFamily.sansMedium,
    lineHeight: 30,
    fontSize: 14,
    color: Palette.amber,
  },
  linkPrimary: {
    fontFamily: FontFamily.sansMedium,
    lineHeight: 30,
    fontSize: 14,
    color: Palette.amber,
  },
  // Code stays on the system mono stack — not a loaded family, so the
  // numeric weight is still doing real work here.
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});

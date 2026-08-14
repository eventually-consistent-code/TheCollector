/**
 * Purpose: Estate & Ember design tokens — the single source of truth for
 * color, type, and spacing. Dark is the only real scheme; the `light` key
 * aliases the same values so useColorScheme callers keep compiling.
 * Author(s): John Reed
 */

import '@/global.css';

import { Platform, type TextStyle } from 'react-native';

// Constants

// Estate & Ember palette — a collector's study, not a screen. Charcoal
// walls, slate shelves, brass hardware, hunter felt, one amber lamp.
export const Palette = {
  charcoal: '#121212',
  slate: '#1A1A1A',
  brass: '#504532',
  hunter: '#355E3B',
  amber: '#FFBF00',
  vellum: '#E5E2E1',
  vellumMuted: '#8A8784',
} as const;

// One scheme, mapped onto the legacy keys plus the new semantic ones.
const estateEmber = {
  // Legacy keys — existing consumers keep compiling, now render Estate & Ember.
  text: Palette.vellum,
  background: Palette.charcoal,
  backgroundElement: Palette.slate,
  backgroundSelected: Palette.hunter,
  textSecondary: Palette.vellumMuted,
  // Semantic keys — prefer these in new code.
  surfaceRaised: Palette.slate,
  hairline: Palette.brass,
  accent: Palette.hunter,
  highlight: Palette.amber,
} as const;

// Dark-only by design: `light` is an alias of the dark values, not a scheme,
// so nothing flashes white and no caller needs a migration.
export const Colors = {
  light: estateEmber,
  dark: estateEmber,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// Loaded font families (see the root layout's useFonts call). Static Google
// Font exports register one family per weight, so "bold" is a family choice
// here — not a fontWeight. Web resolves through the CSS vars in global.css
// so the @font-face fallback stacks still apply before the fonts land.
export const FontFamily = {
  serif: Platform.select({ web: 'var(--font-serif)', default: 'LibreCaslonText_400Regular' }),
  serifBold: Platform.select({ web: 'var(--font-serif-bold)', default: 'LibreCaslonText_700Bold' }),
  sans: Platform.select({ web: 'var(--font-sans)', default: 'Geist_400Regular' }),
  sansMedium: Platform.select({ web: 'var(--font-sans-medium)', default: 'Geist_500Medium' }),
  sansSemiBold: Platform.select({ web: 'var(--font-sans-semibold)', default: 'Geist_600SemiBold' }),
  sansBold: Platform.select({ web: 'var(--font-sans-bold)', default: 'Geist_700Bold' }),
} as const;

// Type scale — serif (Libre Caslon Text) for display/title, Geist for
// body/data, and a letterspaced-caps label helper for section voices.
export const Type = {
  display: { fontFamily: FontFamily.serifBold, fontSize: 34, lineHeight: 40 },
  title: { fontFamily: FontFamily.serifBold, fontSize: 24, lineHeight: 30 },
  body: { fontFamily: FontFamily.sans, fontSize: 16, lineHeight: 24 },
  data: { fontFamily: FontFamily.sansMedium, fontSize: 14, lineHeight: 20 },
  label: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, TextStyle>;

// Generic role stacks — kept for existing consumers (e.g. code blocks use
// `mono`); sans/serif now point at the loaded Estate & Ember families.
export const Fonts = Platform.select({
  ios: {
    sans: 'Geist_400Regular',
    serif: 'LibreCaslonText_400Regular',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'Geist_400Regular',
    serif: 'LibreCaslonText_400Regular',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-sans)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

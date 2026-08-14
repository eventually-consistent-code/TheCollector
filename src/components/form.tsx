/**
 * Purpose: Tiny shared form primitives — stationery text input, labeled
 * field, chip picker, action button — so the CRUD screens stay lean and
 * consistent. Inputs read like a registration ledger: charcoal fill, brass
 * hairline, amber when the pen is on the line.
 * Author(s): John Reed
 */

import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Constants

// Semantic error red — deliberate local, not a palette token.
const ERROR_RED = '#D93025';

// Letterspaced-caps field label — the ledger's column headings.
export function FieldLabel({ children }: { children: string }) {
  return (
    <ThemedText themeColor="textSecondary" style={styles.label}>
      {children}
    </ThemedText>
  );
}

// Stationery input — charcoal fill, brass hairline border, amber focus.
// Shared by the field below plus the search box and tag editor.
export function StationeryInput({
  style,
  onFocus,
  onBlur,
  ...inputProps
}: TextInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[
        styles.input,
        {
          backgroundColor: theme.background,
          color: theme.text,
          borderColor: focused ? theme.highlight : theme.hairline,
        },
        style,
      ]}
      placeholderTextColor={theme.textSecondary}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      {...inputProps}
    />
  );
}

// Labeled single-line input.
export function Field({
  label,
  ...inputProps
}: { label: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <FieldLabel>{label}</FieldLabel>
      <StationeryInput {...inputProps} />
    </View>
  );
}

// Horizontal chip row for picking one value from a short list — active gets
// the hunter fill, the rest sit in brass outline.
export function ChipPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <FieldLabel>{label}</FieldLabel>
      <View style={styles.chips}>
        {options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[
              styles.chip,
              opt === value
                ? { backgroundColor: theme.accent, borderColor: theme.accent }
                : { backgroundColor: 'transparent', borderColor: theme.hairline },
            ]}
          >
            <ThemedText type="small" style={styles.chipText}>
              {opt}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// Primary/destructive action button — hunter fill, vellum text, a brass
// edge while pressed.
export function ActionButton({
  title,
  onPress,
  destructive,
  disabled,
}: {
  title: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.accent,
          borderColor: pressed ? theme.hairline : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <ThemedText style={destructive ? [styles.buttonText, styles.destructive] : styles.buttonText}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6, marginBottom: 16 },
  label: {
    ...Type.label,
  },
  input: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    fontSize: 16,
    fontFamily: FontFamily.sans,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { letterSpacing: 0.3 },
  button: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  destructive: { color: ERROR_RED },
});

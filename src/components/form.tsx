/**
 * Purpose: Tiny shared form primitives — labeled text input, chip picker,
 * action button — so the CRUD screens stay lean and consistent.
 * Author(s): John Reed
 */

import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

// Labeled single-line input.
export function Field({
  label,
  ...inputProps
}: { label: string } & TextInputProps) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: theme.backgroundElement, color: theme.text },
        ]}
        placeholderTextColor={theme.textSecondary}
        {...inputProps}
      />
    </View>
  );
}

// Horizontal chip row for picking one value from a short list.
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
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.chips}>
        {options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[
              styles.chip,
              {
                backgroundColor:
                  opt === value ? theme.backgroundSelected : theme.backgroundElement,
              },
            ]}
          >
            <ThemedText type="small">{opt}</ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// Primary/destructive action button.
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
      style={[
        styles.button,
        { backgroundColor: theme.backgroundSelected, opacity: disabled ? 0.4 : 1 },
      ]}
    >
      <ThemedText type="subtitle" style={destructive ? styles.destructive : undefined}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6, marginBottom: 16 },
  input: {
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  destructive: { color: '#D93025' },
});

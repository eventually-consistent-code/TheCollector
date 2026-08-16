/**
 * Purpose: Profile tab — placeholder until P6.7-T3 lands account settings.
 * Author(s): John Reed
 */

import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ProfileScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      {/* Stub plaque — the real profile screen arrives in T3. */}
      <ThemedText
        themeColor="textSecondary"
        style={StyleSheet.flatten([styles.plaque, { borderColor: theme.hairline }])}
      >
        Profile arrives shortly.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  plaque: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});

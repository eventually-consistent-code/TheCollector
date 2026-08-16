/**
 * Purpose: Insights tab — placeholder until the analytics work lands.
 * Author(s): John Reed
 */

import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function InsightsScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      {/* Stub plaque — real insights arrive in a later task. */}
      <ThemedText
        themeColor="textSecondary"
        style={StyleSheet.flatten([styles.plaque, { borderColor: theme.hairline }])}
      >
        Insights arrive shortly.
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

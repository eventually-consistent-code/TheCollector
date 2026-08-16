/**
 * Purpose: Dashboard tab — placeholder until P6.7-T2 lands the real
 * dashboard. Serif masthead plus a muted plaque, nothing else yet.
 * Author(s): John Reed
 */

import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function DashboardScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">The Collector</ThemedText>
      {/* Stub plaque — replaced by the real dashboard in T2. */}
      <ThemedText
        themeColor="textSecondary"
        style={StyleSheet.flatten([styles.plaque, { borderColor: theme.hairline }])}
      >
        Dashboard arrives shortly.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    padding: Spacing.four,
  },
  plaque: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});

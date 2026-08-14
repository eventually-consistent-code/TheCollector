/**
 * Purpose: Global search — one query across every collection, hits labeled
 * with their vertical + collection so you know where each one lives.
 * Debounced into the live search hook; tap a row to jump to the item.
 * Author(s): John Reed
 */

import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { TagChips } from '@/components/tag-chips';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { parseCustomFields, parseTags } from '@/db/crud';
import { useSearchItems, type SearchItemRow } from '@/db/hooks';
import { useTheme } from '@/hooks/use-theme';
import { debounce } from '@/lib/debounce';
import { centsToDisplay } from '@/lib/money';
import { subtitleFor, templateFor, type FieldValues } from '@/templates';

// Constants

// Estate & Ember accents — brass hairlines, amber values (see tag-chips).
const BRASS = '#504532';
const AMBER = '#FFBF00';

// Quiet window between keystrokes before the watch query re-runs.
const DEBOUNCE_MS = 250;

// One search hit — vertical/collection label, name + amber value, template
// subtitle, tags when the item carries any.
function ResultRow({ item }: { item: SearchItemRow }) {
  const theme = useTheme();
  const template = templateFor(item.collection_vertical);
  const subtitle = subtitleFor(
    template,
    parseCustomFields(item.custom_fields) as FieldValues
  );
  const tags = parseTags(item.tags);

  return (
    <Link href={`/item/${item.id}`} asChild>
      <Pressable
        style={StyleSheet.flatten([
          styles.card,
          { backgroundColor: theme.backgroundElement },
        ])}
      >
        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
          {template.label} · {item.collection_name}
        </ThemedText>
        <View style={styles.nameRow}>
          <ThemedText type="subtitle" style={styles.name} numberOfLines={1}>
            {item.name}
          </ThemedText>
          {item.current_value_cents != null && (
            <ThemedText type="smallBold" style={styles.value}>
              {centsToDisplay(item.current_value_cents)}
            </ThemedText>
          )}
        </View>
        {subtitle !== null && (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        )}
        {tags.length > 0 && <TagChips tags={tags} />}
      </Pressable>
    </Link>
  );
}

export default function SearchScreen() {
  const theme = useTheme();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');

  // Keystrokes land in `input` immediately; `query` trails by DEBOUNCE_MS so
  // the watch query only re-runs once typing settles.
  const applyQuery = useMemo(() => debounce(setQuery, DEBOUNCE_MS), []);
  useEffect(() => () => applyQuery.cancel(), [applyQuery]);

  const { data: results } = useSearchItems(query);
  const searching = query.trim() !== '';
  const count = results?.length ?? 0;

  const onChangeText = (text: string) => {
    setInput(text);
    applyQuery(text);
  };

  // Clear resets both states right away — no reason to debounce an empty box.
  const onClear = () => {
    applyQuery.cancel();
    setInput('');
    setQuery('');
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.backgroundElement, color: theme.text },
          ]}
          placeholder="Search the vault…"
          placeholderTextColor={theme.textSecondary}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          value={input}
          onChangeText={onChangeText}
        />
        {input !== '' && (
          <Pressable hitSlop={8} onPress={onClear} style={styles.clear}>
            <ThemedText type="smallBold" style={styles.clearMark}>
              ×
            </ThemedText>
          </Pressable>
        )}
      </View>
      <FlatList
        data={searching ? results : []}
        keyExtractor={(row) => row.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          searching ? (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.count}
            >
              {count} {count === 1 ? 'match' : 'matches'}
            </ThemedText>
          ) : null
        }
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            {searching
              ? 'Nothing in the vault matches.'
              : 'Type to search every collection — names, notes, and details.'}
          </ThemedText>
        }
        renderItem={({ item }) => <ResultRow item={item} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  clear: { paddingHorizontal: 4 },
  clearMark: { color: AMBER, fontSize: 20 },
  list: { padding: 16 },
  count: { marginBottom: 12 },
  empty: { textAlign: 'center', marginTop: 32 },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BRASS,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 11,
    lineHeight: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  name: { flexShrink: 1 },
  value: { color: AMBER, textAlign: 'right' },
});

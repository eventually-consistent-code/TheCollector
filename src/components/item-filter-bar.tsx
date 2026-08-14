/**
 * Purpose: Filter + sort bar for the collection screen — sort pills, then a
 * collapsible template-driven filter panel (select-field chip groups, a
 * current-value min/max pair, tag chips), clear-all, and an "N of M" count
 * line. All state lives in the screen; this just renders and toggles it.
 * Author(s): John Reed
 */

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import {
  activeFilterCount,
  EMPTY_FILTER_STATE,
  SORT_OPTIONS,
  type ItemFilterState,
} from '@/components/item-filter-state';
import { ThemedText } from '@/components/themed-text';
import type { ItemSort } from '@/db/query';
import { useTheme } from '@/hooks/use-theme';
import type { Template } from '@/templates';

// Constants

// Estate & Ember accents — brass outlines, hunter-green active fill, amber
// for the clear-all affordance.
const BRASS = '#504532';
const HUNTER = '#355E3B';
const AMBER = '#FFBF00';

// One tappable chip — brass outline idle, hunter-green fill when active.
function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <ThemedText type="small">{label}</ThemedText>
    </Pressable>
  );
}

// Letterspaced caps label above each group — matches the app's label voice.
function GroupLabel({ children }: { children: string }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.caps}>
      {children.toUpperCase()}
    </ThemedText>
  );
}

export function ItemFilterBar({
  template,
  sort,
  onSort,
  state,
  onState,
  tags,
  shown,
  total,
}: {
  template: Template;
  sort: ItemSort;
  onSort: (sort: ItemSort) => void;
  state: ItemFilterState;
  onState: (state: ItemFilterState) => void;
  // Distinct tags present in this collection's items.
  tags: string[];
  shown: number;
  total: number;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const selectFields = template.fields.filter(
    (f) => f.type === 'select' && (f.options?.length ?? 0) > 0
  );
  const activeCount = activeFilterCount(state);

  // Single-select per field — tapping the active option clears it.
  const toggleField = (key: string, option: string) => {
    const fields = { ...state.fields };
    if (fields[key] === option) {
      delete fields[key];
    } else {
      fields[key] = option;
    }
    onState({ ...state, fields });
  };

  // Tags multi-select — every active tag must match (AND).
  const toggleTag = (tag: string) => {
    const next = state.tags.includes(tag)
      ? state.tags.filter((t) => t !== tag)
      : [...state.tags, tag];
    onState({ ...state, tags: next });
  };

  return (
    <View style={styles.bar}>
      <GroupLabel>Sort</GroupLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
      >
        {SORT_OPTIONS.map((opt) => (
          <Chip
            key={opt.key}
            label={opt.label}
            active={opt.key === sort}
            onPress={() => onSort(opt.key)}
          />
        ))}
      </ScrollView>

      <View style={styles.filterHead}>
        <Pressable hitSlop={8} onPress={() => setOpen(!open)}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.caps}>
            {`FILTERS ${open ? '▾' : '▸'}${activeCount > 0 ? `  ·  ${activeCount}` : ''}`}
          </ThemedText>
        </Pressable>
        {activeCount > 0 && (
          <Pressable hitSlop={8} onPress={() => onState(EMPTY_FILTER_STATE)}>
            <ThemedText type="small" style={styles.clear}>
              Clear all
            </ThemedText>
          </Pressable>
        )}
      </View>

      {open && (
        <>
          {selectFields.map((def) => (
            <View key={def.key} style={styles.group}>
              <GroupLabel>{def.label}</GroupLabel>
              <View style={styles.chipRow}>
                {def.options!.map((option) => (
                  <Chip
                    key={option}
                    label={option}
                    active={state.fields[def.key] === option}
                    onPress={() => toggleField(def.key, option)}
                  />
                ))}
              </View>
            </View>
          ))}

          <View style={styles.group}>
            <GroupLabel>Value ($)</GroupLabel>
            <View style={styles.rangeRow}>
              <TextInput
                style={[
                  styles.rangeInput,
                  { backgroundColor: theme.backgroundElement, color: theme.text },
                ]}
                placeholder="min"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
                value={state.valueMin}
                onChangeText={(valueMin) => onState({ ...state, valueMin })}
              />
              <TextInput
                style={[
                  styles.rangeInput,
                  { backgroundColor: theme.backgroundElement, color: theme.text },
                ]}
                placeholder="max"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
                value={state.valueMax}
                onChangeText={(valueMax) => onState({ ...state, valueMax })}
              />
            </View>
          </View>

          {tags.length > 0 && (
            <View style={styles.group}>
              <GroupLabel>Tags</GroupLabel>
              <View style={styles.chipRow}>
                {tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    active={state.tags.includes(tag)}
                    onPress={() => toggleTag(tag)}
                  />
                ))}
              </View>
            </View>
          )}
        </>
      )}

      {activeCount > 0 && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.count}>
          {shown} of {total}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { gap: 8, marginBottom: 4 },
  caps: { letterSpacing: 1.5, textTransform: 'uppercase' },
  // pillRow scrolls horizontally (no wrap allowed there); chipRow wraps.
  pillRow: { flexDirection: 'row', gap: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: BRASS,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  chipActive: {
    backgroundColor: HUNTER,
    borderColor: HUNTER,
  },
  filterHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  clear: { color: AMBER, fontWeight: 'bold' },
  group: { gap: 6 },
  rangeRow: { flexDirection: 'row', gap: 8 },
  rangeInput: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
  },
  count: { marginTop: 4 },
});

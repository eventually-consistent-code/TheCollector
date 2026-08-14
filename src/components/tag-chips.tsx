/**
 * Purpose: Tag chips — a read-only brass-outline chip row for display, and
 * an editor (text input + removable chips) for the item form. Normalization
 * lives in crud.ts so the db and UI agree on what a tag is.
 * Author(s): John Reed
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FieldLabel, StationeryInput } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
// Estate & Ember accents — brass outline, amber remove affordance — from the
// shared token palette.
import { FontFamily, Palette } from '@/constants/theme';
import { normalizeTags } from '@/db/crud';

// Read-only chip row — renders nothing when there are no tags.
export function TagChips({ tags }: { tags: string[] }) {
  if (!tags.length) {
    return null;
  }
  return (
    <View style={styles.row}>
      {tags.map((tag) => (
        <View key={tag} style={styles.chip}>
          <ThemedText type="small" style={styles.chipText}>
            {tag}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

// Editor — type a tag, add on return or comma, tap × to remove.
export function TagEditor({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  // Folds the draft (comma-separated is fine) into the normalized set.
  const commit = (text: string) => {
    const next = normalizeTags([...tags, ...text.split(',')]);
    onChange(next);
    setDraft('');
  };

  return (
    <View style={styles.field}>
      <FieldLabel>Tags</FieldLabel>
      {tags.length > 0 && (
        <View style={styles.row}>
          {tags.map((tag) => (
            <View key={tag} style={styles.chip}>
              <ThemedText type="small" style={styles.chipText}>
                {tag}
              </ThemedText>
              <Pressable
                hitSlop={8}
                onPress={() => onChange(tags.filter((t) => t !== tag))}
              >
                <ThemedText type="small" style={styles.remove}>
                  ×
                </ThemedText>
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <StationeryInput
        placeholder="add a tag, comma or return to add"
        autoCapitalize="none"
        autoCorrect={false}
        value={draft}
        onChangeText={(text) => {
          // Comma commits immediately — chip-editor muscle memory.
          if (text.includes(',')) {
            commit(text);
          } else {
            setDraft(text);
          }
        }}
        onSubmitEditing={() => commit(draft)}
        submitBehavior="submit"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6, marginBottom: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Palette.brass,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  chipText: { fontFamily: FontFamily.sansMedium, letterSpacing: 0.3 },
  remove: { color: Palette.amber, fontFamily: FontFamily.sansBold },
});

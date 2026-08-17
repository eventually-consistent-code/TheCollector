/**
 * Purpose: Shared item form — common fields plus the vertical template's
 * custom fields. New-item and edit-item are the same fields with different
 * save wiring.
 * Author(s): John Reed
 */

import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ActionButton, Field } from '@/components/form';
import { NameLookupPopover, useNameLookup } from '@/components/name-lookup';
import { TagEditor } from '@/components/tag-chips';
import { TemplateFields } from '@/components/template-fields';
import { ThemedText } from '@/components/themed-text';
import type { ItemFieldsInput } from '@/db/crud';
import { parseCustomFields, parseTags } from '@/db/crud';
import type { ItemRecord } from '@/db/schema';
// Money values render in Geist with the amber tint — the ledger's ink.
import { FontFamily, Palette, Spacing } from '@/constants/theme';
import { centsToDisplay, displayToCents } from '@/lib/money';
import type { MetadataAdapter, MetadataResult } from '@/metadata';
import { fillFromResult } from '@/metadata/typeahead';
import type { FieldValues, Template } from '@/templates';

// Pre-fills from an existing row when editing.
export function ItemForm({
  template,
  initial,
  prefill,
  lookup,
  saveLabel,
  onSave,
  footer,
}: {
  template: Template;
  initial?: ItemRecord;
  // Scan-to-add seeds — used only when there is no existing row to edit.
  prefill?: { name?: string; customFields?: FieldValues };
  // Type-ahead lookup on the name field — new items only; the picked
  // match's cover art reports up through onImageUrl for the save path.
  lookup?: {
    adapter: MetadataAdapter;
    onImageUrl: (url: string | undefined) => void;
  };
  saveLabel: string;
  onSave: (input: ItemFieldsInput) => void | Promise<void>;
  // Extra content rendered above the save button (e.g. the photo section).
  footer?: ReactNode;
}) {
  const [name, setName] = useState(initial?.name ?? prefill?.name ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [acquiredAt, setAcquiredAt] = useState(initial?.acquired_at ?? '');
  const [purchase, setPurchase] = useState(
    initial?.purchase_price_cents != null
      ? centsToDisplay(initial.purchase_price_cents).slice(1)
      : ''
  );
  const [value, setValue] = useState(
    initial?.current_value_cents != null
      ? centsToDisplay(initial.current_value_cents).slice(1)
      : ''
  );
  const [custom, setCustom] = useState<FieldValues>(() =>
    initial?.custom_fields
      ? (parseCustomFields(initial.custom_fields) as FieldValues)
      : (prefill?.customFields ?? {})
  );
  const [tags, setTags] = useState<string[]>(() => parseTags(initial?.tags ?? null));

  // Type-ahead only lives on new-item forms with a lookup source; editing
  // an existing row never fires it (initial disables the controller).
  const suggest = useNameLookup(lookup?.adapter, !initial);

  const changeName = (text: string) => {
    setName(text);
    suggest.setQuery(text);
  };

  // Pick-to-fill — same mapping the scan prefill uses; cover art is stashed
  // for the save path, and nothing auto-saves.
  const pickSuggestion = (result: MetadataResult) => {
    const fill = fillFromResult(result);
    setName(fill.name);
    setCustom((prev) => ({ ...prev, ...fill.customFields }));
    lookup?.onImageUrl(fill.imageUrl);
    suggest.dismiss();
  };

  const save = () =>
    onSave({
      name: name.trim(),
      notes: notes.trim() || undefined,
      acquiredAt: acquiredAt.trim() || undefined,
      purchasePriceCents: displayToCents(purchase) ?? undefined,
      currentValueCents: displayToCents(value) ?? undefined,
      customFields: Object.keys(custom).length ? custom : undefined,
      tags: tags.length ? tags : undefined,
    });

  return (
    <ScrollView
      contentContainerStyle={{ padding: Spacing.three }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Tap anywhere outside the name field to close the popover — the
          backdrop sits over the rest of the form, never over the field, so
          typing continues uninterrupted. */}
      {suggest.open && (
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={suggest.dismiss}
          accessible={false}
        />
      )}
      <View style={styles.nameAnchor}>
        <Field label="Name" value={name} onChangeText={changeName} autoFocus={!initial} />
        <NameLookupPopover state={suggest.state} onPick={pickSuggestion} />
      </View>
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      <Field
        label="Acquired (YYYY-MM-DD)"
        value={acquiredAt}
        onChangeText={setAcquiredAt}
        placeholder="2026-08-09"
      />
      <Field
        label="Purchase price ($)"
        value={purchase}
        onChangeText={setPurchase}
        keyboardType="decimal-pad"
        placeholder="12.34"
        style={styles.money}
      />
      <Field
        label="Current value ($)"
        value={value}
        onChangeText={setValue}
        keyboardType="decimal-pad"
        placeholder="20.00"
        style={styles.money}
      />
      <TagEditor tags={tags} onChange={setTags} />
      {template.fields.length > 0 && (
        <>
          <ThemedText type="subtitle" style={{ marginTop: 8, marginBottom: 12 }}>
            {template.label} details
          </ThemedText>
          <TemplateFields fields={template.fields} values={custom} onChange={setCustom} />
        </>
      )}
      {footer}
      <ActionButton title={saveLabel} onPress={save} disabled={!name.trim()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  money: { fontFamily: FontFamily.sansMedium, color: Palette.amber },
  // Popover anchor — relative so the suggestions hang off the field, above
  // the backdrop and the rest of the form.
  nameAnchor: { position: 'relative', zIndex: 2 },
  backdrop: { zIndex: 1 },
});

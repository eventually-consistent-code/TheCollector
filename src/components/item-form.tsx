/**
 * Purpose: Shared item form — common fields plus the vertical template's
 * custom fields. New-item and edit-item are the same fields with different
 * save wiring.
 * Author(s): John Reed
 */

import { useState, type ReactNode } from 'react';
import { ScrollView } from 'react-native';

import { ActionButton, Field } from '@/components/form';
import { TemplateFields } from '@/components/template-fields';
import { ThemedText } from '@/components/themed-text';
import type { ItemFieldsInput } from '@/db/crud';
import { parseCustomFields } from '@/db/crud';
import type { ItemRecord } from '@/db/schema';
import { centsToDisplay, displayToCents } from '@/lib/money';
import type { FieldValues, Template } from '@/templates';

// Pre-fills from an existing row when editing.
export function ItemForm({
  template,
  initial,
  prefill,
  saveLabel,
  onSave,
  footer,
}: {
  template: Template;
  initial?: ItemRecord;
  // Scan-to-add seeds — used only when there is no existing row to edit.
  prefill?: { name?: string; customFields?: FieldValues };
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

  const save = () =>
    onSave({
      name: name.trim(),
      notes: notes.trim() || undefined,
      acquiredAt: acquiredAt.trim() || undefined,
      purchasePriceCents: displayToCents(purchase) ?? undefined,
      currentValueCents: displayToCents(value) ?? undefined,
      customFields: Object.keys(custom).length ? custom : undefined,
    });

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Field label="Name" value={name} onChangeText={setName} autoFocus={!initial} />
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
      />
      <Field
        label="Current value ($)"
        value={value}
        onChangeText={setValue}
        keyboardType="decimal-pad"
        placeholder="20.00"
      />
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

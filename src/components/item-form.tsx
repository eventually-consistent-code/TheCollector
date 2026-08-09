/**
 * Purpose: Shared item form — new-item and edit-item screens are the same
 * fields with different save wiring.
 * Author(s): John Reed
 */

import { useState } from 'react';
import { ScrollView } from 'react-native';

import { ActionButton, Field } from '@/components/form';
import type { ItemFieldsInput } from '@/db/crud';
import type { ItemRecord } from '@/db/schema';
import { centsToDisplay, displayToCents } from '@/lib/money';

// Pre-fills from an existing row when editing.
export function ItemForm({
  initial,
  saveLabel,
  onSave,
}: {
  initial?: ItemRecord;
  saveLabel: string;
  onSave: (input: ItemFieldsInput) => void | Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
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

  const save = () =>
    onSave({
      name: name.trim(),
      notes: notes.trim() || undefined,
      acquiredAt: acquiredAt.trim() || undefined,
      purchasePriceCents: displayToCents(purchase) ?? undefined,
      currentValueCents: displayToCents(value) ?? undefined,
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
      <ActionButton title={saveLabel} onPress={save} disabled={!name.trim()} />
    </ScrollView>
  );
}

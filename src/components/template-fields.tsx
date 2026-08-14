/**
 * Purpose: Renders a template's field defs bound to a values object — the
 * dynamic half of the item form. Money fields edit in dollars, store cents.
 * Author(s): John Reed
 */

import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ChipPicker, Field } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
// Money values render in Geist with the amber tint — the ledger's ink.
import { FontFamily, Palette, Type } from '@/constants/theme';
import { centsToDisplay, displayToCents } from '@/lib/money';
import type { FieldDef, FieldValues } from '@/templates';

// One field, dispatched by type.
function TemplateField({
  def,
  value,
  onChange,
}: {
  def: FieldDef;
  value: FieldValues[string] | undefined;
  onChange: (v: FieldValues[string] | undefined) => void;
}) {
  switch (def.type) {
    case 'select':
      return (
        <View>
          <ChipPicker
            label={def.label}
            options={def.options ?? []}
            value={typeof value === 'string' ? value : ''}
            onChange={onChange}
          />
          {typeof value === 'string' && value !== '' && (
            <Pressable onPress={() => onChange(undefined)} style={styles.clear}>
              <ThemedText type="small" themeColor="textSecondary">
                clear
              </ThemedText>
            </Pressable>
          )}
        </View>
      );
    case 'boolean':
      return (
        <View style={styles.switchRow}>
          <ThemedText themeColor="textSecondary" style={styles.switchLabel}>
            {def.label}
          </ThemedText>
          <Switch value={value === true} onValueChange={(v) => onChange(v)} />
        </View>
      );
    case 'number':
      return (
        <Field
          label={def.label}
          value={value === undefined ? '' : String(value)}
          onChangeText={(t) => {
            const trimmed = t.trim();
            if (trimmed === '') {
              onChange(undefined);
              return;
            }
            const n = Number(trimmed);
            onChange(Number.isFinite(n) ? n : trimmed);
          }}
          keyboardType="decimal-pad"
          placeholder={def.placeholder}
        />
      );
    case 'money':
      return <MoneyField def={def} value={value} onChange={onChange} />;
    case 'date':
      return (
        <Field
          label={`${def.label} (YYYY-MM-DD)`}
          value={String(value ?? '')}
          onChangeText={(t) => onChange(t.trim() === '' ? undefined : t)}
          placeholder={def.placeholder ?? '2026-08-12'}
        />
      );
    default:
      return (
        <Field
          label={def.label}
          value={String(value ?? '')}
          onChangeText={(t) => onChange(t === '' ? undefined : t)}
          placeholder={def.placeholder}
        />
      );
  }
}

// Money edits keep raw text locally — reformatting per keystroke mangles
// typing ("5.01.99"). Cents land in values; text is what the user sees.
function MoneyField({
  def,
  value,
  onChange,
}: {
  def: FieldDef;
  value: FieldValues[string] | undefined;
  onChange: (v: FieldValues[string] | undefined) => void;
}) {
  const [text, setText] = useState(() =>
    typeof value === 'number' ? centsToDisplay(value).slice(1) : String(value ?? '')
  );
  return (
    <Field
      label={`${def.label} ($)`}
      value={text}
      onChangeText={(t) => {
        setText(t);
        const cents = displayToCents(t);
        onChange(cents === null ? undefined : cents);
      }}
      keyboardType="decimal-pad"
      placeholder={def.placeholder ?? '12.34'}
      style={styles.money}
    />
  );
}

// The whole template section.
export function TemplateFields({
  fields,
  values,
  onChange,
}: {
  fields: readonly FieldDef[];
  values: FieldValues;
  onChange: (values: FieldValues) => void;
}) {
  const setValue = (key: string, v: FieldValues[string] | undefined) => {
    const next = { ...values };
    if (v === undefined) {
      delete next[key];
    } else {
      next[key] = v;
    }
    onChange(next);
  };

  return (
    <View>
      {fields.map((def) => (
        <TemplateField
          key={def.key}
          def={def}
          value={values[def.key]}
          onChange={(v) => setValue(def.key, v)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  switchLabel: { flex: 1, ...Type.label },
  clear: { marginTop: -10, marginBottom: 12, alignSelf: 'flex-end' },
  money: { fontFamily: FontFamily.sansMedium, color: Palette.amber },
});

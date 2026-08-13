/**
 * Purpose: Renders a template's field defs bound to a values object — the
 * dynamic half of the item form. Money fields edit in dollars, store cents.
 * Author(s): John Reed
 */

import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ChipPicker, Field } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
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
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.switchLabel}>
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
      return (
        <Field
          label={`${def.label} ($)`}
          value={
            typeof value === 'number' ? centsToDisplay(value).slice(1) : String(value ?? '')
          }
          onChangeText={(t) => {
            const cents = displayToCents(t);
            onChange(cents === null ? (t.trim() === '' ? undefined : t) : cents);
          }}
          keyboardType="decimal-pad"
          placeholder={def.placeholder ?? '12.34'}
        />
      );
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
  switchLabel: { flex: 1 },
  clear: { marginTop: -10, marginBottom: 12, alignSelf: 'flex-end' },
});

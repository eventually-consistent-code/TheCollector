/**
 * Purpose: Template model — a vertical's custom field definitions, plus the
 * bits the UI needs (subtitle resolution). Values live in items.custom_fields
 * as JSON keyed by FieldDef.key.
 * Author(s): John Reed
 */

export type FieldType = 'text' | 'number' | 'date' | 'money' | 'select' | 'boolean';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  // Required for selects; decades-stable scales only (see phase 3 CONTEXT).
  options?: readonly string[];
  placeholder?: string;
}

export type FieldValue = string | number | boolean;
export type FieldValues = Record<string, FieldValue>;

export interface Template {
  // Matches collections.vertical.
  id: string;
  label: string;
  fields: readonly FieldDef[];
  // Keys (in order) joined for the list-row subtitle, e.g. set + number.
  subtitleKeys: readonly string[];
}

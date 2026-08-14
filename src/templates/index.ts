/**
 * Purpose: Template registry — vertical id → template, plus helpers the UI
 * leans on (subtitle resolution, value formatting).
 * Author(s): John Reed
 */

import {
  bourbon,
  cigars,
  comics,
  funko,
  lego,
  movies,
  other,
  tradingCards,
  videoGames,
  vinyl,
} from './definitions';
import type { FieldDef, FieldValues, Template } from './types';

export type { FieldDef, FieldType, FieldValue, FieldValues, Template } from './types';

// Constants

export const TEMPLATES: readonly Template[] = [
  tradingCards,
  comics,
  vinyl,
  videoGames,
  movies,
  bourbon,
  lego,
  funko,
  cigars,
  other,
];

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

// Registry lookups

// Unknown verticals fall back to the generic template — old rows keep working.
export function templateFor(vertical: string | null | undefined): Template {
  return BY_ID.get(vertical ?? '') ?? other;
}

export const VERTICAL_IDS = TEMPLATES.map((t) => t.id);

// Display helpers

// Formats one field value for display ("$12.34", "Yes", plain text).
export function formatFieldValue(def: FieldDef, value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  switch (def.type) {
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'money': {
      const cents = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(cents) ? `$${(cents / 100).toFixed(2)}` : null;
    }
    default:
      return String(value);
  }
}

// List-row subtitle from the template's subtitle keys, e.g. "Base Set · #4".
export function subtitleFor(template: Template, values: FieldValues): string | null {
  const parts = template.subtitleKeys
    .map((key) => {
      const def = template.fields.find((f) => f.key === key);
      return def ? formatFieldValue(def, values[key]) : null;
    })
    .filter((v): v is string => v !== null && v !== '');
  return parts.length ? parts.join(' · ') : null;
}

/**
 * Purpose: Pure state model for the collection filter bar — raw UI state in
 * (select picks, tag picks, dollar-text value range), compiled query filter
 * out. No React, no db; item-filter-bar.tsx renders it and hooks.ts consumes
 * the output.
 * Author(s): John Reed
 */

import { compileFilters } from '../db/query';
import type { ItemListFilter, ItemSort, NumberRange } from '../db/query';
import { displayToCents } from '../lib/money';
import type { Template } from '../templates';

// Constants

// Sort options in display order, with human labels for the pill row.
export const SORT_OPTIONS: readonly { key: ItemSort; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'name_asc', label: 'Name A–Z' },
  { key: 'name_desc', label: 'Name Z–A' },
  { key: 'value_desc', label: 'Value ↓' },
  { key: 'value_asc', label: 'Value ↑' },
  { key: 'acquired_desc', label: 'Acquired' },
];

// The bar's whole filter state. Select fields are single-select per field
// (a cleared field's key is DELETED, never set to ''); tags are multi-select
// and AND-composed; the value range holds raw dollar text as typed.
export interface ItemFilterState {
  fields: Record<string, string>;
  tags: string[];
  valueMin: string;
  valueMax: string;
}

export const EMPTY_FILTER_STATE: ItemFilterState = {
  fields: {},
  tags: [],
  valueMin: '',
  valueMax: '',
};

// How many individual filters are set — drives the badge on the toggle.
// Unparseable value text counts for nothing.
export function activeFilterCount(state: ItemFilterState): number {
  return (
    Object.keys(state.fields).length +
    state.tags.length +
    (displayToCents(state.valueMin) !== null ? 1 : 0) +
    (displayToCents(state.valueMax) !== null ? 1 : 0)
  );
}

// True when anything is set — drives clear-all and the "N of M" count line.
export function hasActiveFilters(state: ItemFilterState): boolean {
  return activeFilterCount(state) > 0;
}

// UI state -> the query layer's ItemListFilter, or undefined when nothing is
// active (so the hook runs the plain unfiltered query). Garbage value text is
// treated as unset rather than surprising the user with zero rows.
export function toItemListFilter(
  template: Template,
  state: ItemFilterState
): ItemListFilter | undefined {
  const compiled = compileFilters(template.fields, {
    fields: state.fields,
    tags: state.tags,
  });

  const min = displayToCents(state.valueMin);
  const max = displayToCents(state.valueMax);
  const value: NumberRange | undefined =
    min === null && max === null
      ? undefined
      : { min: min ?? undefined, max: max ?? undefined };

  if (compiled.sql === '' && value === undefined) {
    return undefined;
  }
  return { compiled, value };
}

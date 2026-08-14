/**
 * Purpose: Filter-bar state model tests — UI state through toItemListFilter
 * into the query layer's compiled shape. Pure; no db, no React.
 * Author(s): John Reed
 */

import {
  activeFilterCount,
  hasActiveFilters,
  toItemListFilter,
  EMPTY_FILTER_STATE,
  SORT_OPTIONS,
} from '../item-filter-state';
import type { ItemSort } from '../../db/query';
import type { Template } from '../../templates';

// Minimal template with one select field — matches what the bar renders.
const TEMPLATE: Template = {
  id: 'test',
  label: 'Test',
  fields: [
    { key: 'condition', label: 'Condition', type: 'select', options: ['Mint', 'Poor'] },
    { key: 'artist', label: 'Artist', type: 'text' },
  ],
  subtitleKeys: [],
};

// The compiler's json_extract wrapper, same shorthand as query.test.ts.
const X = (key: string) =>
  `(CASE WHEN json_valid(custom_fields) ` +
  `THEN json_extract(custom_fields, '$.${key}') END)`;

describe('SORT_OPTIONS', () => {
  test('covers every ItemSort exactly once with a human label', () => {
    const all: ItemSort[] = [
      'name_asc',
      'name_desc',
      'newest',
      'oldest',
      'value_desc',
      'value_asc',
      'acquired_desc',
    ];
    expect(new Set(SORT_OPTIONS.map((o) => o.key))).toEqual(new Set(all));
    expect(SORT_OPTIONS).toHaveLength(all.length);
    for (const opt of SORT_OPTIONS) {
      expect(opt.label.length).toBeGreaterThan(0);
    }
  });
});

describe('toItemListFilter', () => {
  test('empty state maps to undefined so the plain query runs', () => {
    expect(toItemListFilter(TEMPLATE, EMPTY_FILTER_STATE)).toBeUndefined();
    expect(hasActiveFilters(EMPTY_FILTER_STATE)).toBe(false);
    expect(activeFilterCount(EMPTY_FILTER_STATE)).toBe(0);
  });

  test('select pick compiles through compileFilters', () => {
    const state = { ...EMPTY_FILTER_STATE, fields: { condition: 'Mint' } };
    const out = toItemListFilter(TEMPLATE, state)!;
    expect(out.compiled).toEqual({ sql: `${X('condition')} = ?`, params: ['Mint'] });
    expect(out.value).toBeUndefined();
    expect(activeFilterCount(state)).toBe(1);
  });

  test('tags AND-compose and count individually', () => {
    const state = { ...EMPTY_FILTER_STATE, tags: ['rare', 'graded'] };
    const out = toItemListFilter(TEMPLATE, state)!;
    expect(out.compiled!.params).toEqual(['rare', 'graded']);
    expect(out.compiled!.sql).toContain('json_each(items.tags)');
    expect(activeFilterCount(state)).toBe(2);
  });

  test('dollar text becomes a cents range; garbage sides are unset', () => {
    const state = { ...EMPTY_FILTER_STATE, valueMin: '19.99', valueMax: '$100' };
    const out = toItemListFilter(TEMPLATE, state)!;
    expect(out.value).toEqual({ min: 1999, max: 10000 });
    expect(activeFilterCount(state)).toBe(2);

    const halfGarbage = { ...EMPTY_FILTER_STATE, valueMin: 'abc', valueMax: '5' };
    expect(toItemListFilter(TEMPLATE, halfGarbage)!.value).toEqual({
      min: undefined,
      max: 500,
    });
    expect(activeFilterCount(halfGarbage)).toBe(1);
  });

  test('garbage-only value text means no filter at all', () => {
    const state = { ...EMPTY_FILTER_STATE, valueMin: 'abc' };
    expect(toItemListFilter(TEMPLATE, state)).toBeUndefined();
    expect(hasActiveFilters(state)).toBe(false);
  });

  test('all filter kinds compose into one ItemListFilter', () => {
    const state = {
      fields: { condition: 'Poor' },
      tags: ['rare'],
      valueMin: '1',
      valueMax: '',
    };
    const out = toItemListFilter(TEMPLATE, state)!;
    expect(out.compiled!.params).toEqual(['Poor', 'rare']);
    expect(out.value).toEqual({ min: 100, max: undefined });
    expect(activeFilterCount(state)).toBe(3);
    expect(hasActiveFilters(state)).toBe(true);
  });
});

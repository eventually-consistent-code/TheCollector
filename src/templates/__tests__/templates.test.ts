/**
 * Purpose: Template registry invariants + display helpers. Cheap tests that
 * keep twelve hand-written field tables honest.
 * Author(s): John Reed
 */

import { TEMPLATES, formatFieldValue, subtitleFor, templateFor } from '../index';

describe('registry invariants', () => {
  test('thirteen templates, unique ids', () => {
    expect(TEMPLATES).toHaveLength(13);
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test.each(TEMPLATES.map((t) => [t.id, t] as const))('%s is well-formed', (_id, t) => {
    // Unique field keys.
    const keys = t.fields.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    // Selects carry options; nothing else does.
    for (const f of t.fields) {
      if (f.type === 'select') {
        expect(f.options?.length).toBeGreaterThan(1);
      } else {
        expect(f.options).toBeUndefined();
      }
      // snake_case keys — these become JSON + phase-5 mapping targets.
      expect(f.key).toMatch(/^[a-z][a-z0-9_]*$/);
    }
    // Subtitle keys reference real fields.
    for (const key of t.subtitleKeys) {
      expect(keys).toContain(key);
    }
  });

  test('shared grading trio keeps identical keys across slabbed verticals', () => {
    for (const id of ['trading-cards', 'comics', 'video-games']) {
      const keys = templateFor(id).fields.map((f) => f.key);
      expect(keys).toContain('grade');
      expect(keys).toContain('grading_company');
    }
  });

  test('unknown vertical falls back to other', () => {
    expect(templateFor('does-not-exist').id).toBe('other');
    expect(templateFor(null).id).toBe('other');
  });
});

// Phase 5.5 verticals — one test per template pinning the design calls.

describe('phase 5.5 verticals', () => {
  test('art carries the manual-entry field set incl. insured value as money', () => {
    const t = templateFor('art');
    const byKey = new Map(t.fields.map((f) => [f.key, f]));
    for (const key of ['artist', 'year', 'medium', 'dimensions', 'provenance', 'exhibition_history', 'insured_value']) {
      expect(byKey.has(key)).toBe(true);
    }
    expect(byKey.get('insured_value')?.type).toBe('money');
    expect(subtitleFor(t, { artist: 'Rothko', year: 1954 })).toBe('Rothko · 1954');
  });

  test('timepieces tracks box and papers as booleans', () => {
    const t = templateFor('timepieces');
    const byKey = new Map(t.fields.map((f) => [f.key, f]));
    for (const key of ['brand', 'model', 'reference_number', 'movement', 'case_material', 'case_diameter_mm', 'production_years', 'has_box', 'has_papers']) {
      expect(byKey.has(key)).toBe(true);
    }
    expect(byKey.get('has_box')?.type).toBe('boolean');
    expect(byKey.get('has_papers')?.type).toBe('boolean');
    expect(byKey.get('case_diameter_mm')?.type).toBe('number');
  });

  test('cigars uses selects for vitola and wrapper', () => {
    const t = templateFor('cigars');
    const byKey = new Map(t.fields.map((f) => [f.key, f]));
    for (const key of ['brand', 'line', 'vitola', 'wrapper', 'binder', 'filler', 'ring_gauge', 'length_inches', 'country', 'release_year', 'box_count']) {
      expect(byKey.has(key)).toBe(true);
    }
    expect(byKey.get('vitola')?.type).toBe('select');
    expect(byKey.get('vitola')?.options).toContain('Robusto');
    expect(byKey.get('wrapper')?.type).toBe('select');
    expect(byKey.get('wrapper')?.options).toContain('Maduro');
  });

  test('books keeps edition/printing as collector-asserted free text', () => {
    const t = templateFor('books');
    const byKey = new Map(t.fields.map((f) => [f.key, f]));
    for (const key of ['author', 'publisher', 'publish_date', 'isbn', 'edition_printing', 'binding', 'signed']) {
      expect(byKey.has(key)).toBe(true);
    }
    // Free text ON PURPOSE — no options, no auto-detection.
    expect(byKey.get('edition_printing')?.type).toBe('text');
    expect(byKey.get('edition_printing')?.options).toBeUndefined();
    expect(byKey.get('signed')?.type).toBe('boolean');
    expect(subtitleFor(t, { author: 'Le Guin' })).toBe('Le Guin');
  });

  test('legacy fallback still works with expanded registry', () => {
    expect(templateFor('does-not-exist').id).toBe('other');
    expect(templateFor(null).id).toBe('other');
  });
});

describe('formatFieldValue', () => {
  const text = { key: 'k', label: 'K', type: 'text' } as const;
  const bool = { key: 'k', label: 'K', type: 'boolean' } as const;
  const money = { key: 'k', label: 'K', type: 'money' } as const;

  test.each([
    [text, 'hello', 'hello'],
    [text, '', null],
    [text, undefined, null],
    [bool, true, 'Yes'],
    [bool, false, 'No'],
    [money, 5999, '$59.99'],
    [money, 'garbage', null],
  ])('%# formats correctly', (def, value, expected) => {
    expect(formatFieldValue(def, value)).toBe(expected);
  });
});

describe('subtitleFor', () => {
  test('joins present subtitle values, skips missing', () => {
    const cards = templateFor('trading-cards');
    expect(subtitleFor(cards, { set_name: 'Base Set', card_number: '4/102' })).toBe(
      'Base Set · 4/102'
    );
    expect(subtitleFor(cards, { set_name: 'Base Set' })).toBe('Base Set');
    expect(subtitleFor(cards, {})).toBeNull();
  });

  test('other template has no subtitle', () => {
    expect(subtitleFor(templateFor('other'), { category: 'x' })).toBeNull();
  });
});

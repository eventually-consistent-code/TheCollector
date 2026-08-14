/**
 * Purpose: Template registry invariants + display helpers. Cheap tests that
 * keep eight hand-written field tables honest.
 * Author(s): John Reed
 */

import { TEMPLATES, formatFieldValue, subtitleFor, templateFor } from '../index';

describe('registry invariants', () => {
  test('ten templates, unique ids', () => {
    expect(TEMPLATES).toHaveLength(10);
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

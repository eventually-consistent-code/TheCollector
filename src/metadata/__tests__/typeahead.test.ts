/**
 * Purpose: Type-ahead controller tests — trigger rules (min chars, trailing
 * debounce, no-adapter and edit-mode no-ops), the stale-response guard,
 * degradation-message pass-through, and the pick-to-fill mapping. Mocked
 * adapter, fake timers throughout.
 * Author(s): John Reed
 */

// The real client throws without env vars and drags in RN internals; the
// metadata layer only touches functions.invoke.
jest.mock('@/auth/client', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

import { MetadataProxyError } from '../proxy';
import {
  createTypeahead,
  fillFromResult,
  TYPEAHEAD_DEBOUNCE_MS,
  type TypeaheadState,
} from '../typeahead';
import type { MetadataAdapter, MetadataResult } from '../types';

// A hand-rolled promise so each test decides exactly when a "response"
// lands — the only honest way to test the stale guard.
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Let queued microtasks (awaited responses) settle under fake timers.
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

function result(title: string, overrides: Partial<MetadataResult> = {}): MetadataResult {
  return { title, fields: {}, source: 'Test', ...overrides };
}

function makeAdapter(searchByText: jest.Mock): MetadataAdapter {
  return { templateId: 'vinyl', searchByText };
}

describe('createTypeahead', () => {
  let states: TypeaheadState[];
  const onState = (state: TypeaheadState) => states.push(state);

  beforeEach(() => {
    jest.useFakeTimers();
    states = [];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('no adapter — inert, nothing fires', () => {
    const controller = createTypeahead({ adapter: undefined, enabled: true, onState });

    controller.setQuery('longines heritage');
    jest.advanceTimersByTime(TYPEAHEAD_DEBOUNCE_MS * 2);

    expect(states).toEqual([]);
  });

  test('edit mode (enabled: false) — inert even with an adapter', () => {
    const search = jest.fn();
    const controller = createTypeahead({
      adapter: makeAdapter(search),
      enabled: false,
      onState,
    });

    controller.setQuery('longines heritage');
    jest.advanceTimersByTime(TYPEAHEAD_DEBOUNCE_MS * 2);

    expect(search).not.toHaveBeenCalled();
    expect(states).toEqual([]);
  });

  test('under three trimmed chars never searches and closes the popover', () => {
    const search = jest.fn();
    const controller = createTypeahead({ adapter: makeAdapter(search), enabled: true, onState });

    controller.setQuery('ab');
    controller.setQuery('  ab  '); // trims down below the bar
    jest.advanceTimersByTime(TYPEAHEAD_DEBOUNCE_MS * 2);

    expect(search).not.toHaveBeenCalled();
    // Each short query dismisses — the "name field cleared" path.
    expect(states.every((s) => s.kind === 'idle')).toBe(true);
    expect(states.length).toBeGreaterThan(0);
  });

  test('debounces on the trailing edge — only the latest query searches', async () => {
    const search = jest.fn().mockResolvedValue([result('Kind of Blue')]);
    const controller = createTypeahead({ adapter: makeAdapter(search), enabled: true, onState });

    controller.setQuery('kin');
    jest.advanceTimersByTime(TYPEAHEAD_DEBOUNCE_MS - 1);
    expect(search).not.toHaveBeenCalled();

    controller.setQuery('kind of');
    jest.advanceTimersByTime(TYPEAHEAD_DEBOUNCE_MS - 1);
    expect(search).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    await flush();

    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('kind of');
    expect(states).toEqual([
      { kind: 'loading' },
      { kind: 'results', results: [result('Kind of Blue')] },
    ]);
  });

  test('caps the popover at five rows', async () => {
    const seven = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((t) => result(t));
    const search = jest.fn().mockResolvedValue(seven);
    const controller = createTypeahead({ adapter: makeAdapter(search), enabled: true, onState });

    controller.setQuery('letters');
    jest.advanceTimersByTime(TYPEAHEAD_DEBOUNCE_MS);
    await flush();

    const last = states[states.length - 1];
    expect(last.kind).toBe('results');
    if (last.kind === 'results') {
      expect(last.results).toHaveLength(5);
      expect(last.results[0].title).toBe('a');
    }
  });

  test('empty results close the popover instead of showing a blank card', async () => {
    const search = jest.fn().mockResolvedValue([]);
    const controller = createTypeahead({ adapter: makeAdapter(search), enabled: true, onState });

    controller.setQuery('zzz nothing');
    jest.advanceTimersByTime(TYPEAHEAD_DEBOUNCE_MS);
    await flush();

    expect(states).toEqual([{ kind: 'loading' }, { kind: 'idle' }]);
  });

  test('stale response never overwrites a newer one', async () => {
    const first = deferred<MetadataResult[]>();
    const second = deferred<MetadataResult[]>();
    const search = jest
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const controller = createTypeahead({ adapter: makeAdapter(search), enabled: true, onState });

    controller.setQuery('dark side');
    jest.advanceTimersByTime(TYPEAHEAD_DEBOUNCE_MS);

    controller.setQuery('dark side of the moon');
    jest.advanceTimersByTime(TYPEAHEAD_DEBOUNCE_MS);

    // The newer query answers first...
    second.resolve([result('The Dark Side of the Moon')]);
    await flush();
    // ...then the older one limps in late and must be ignored.
    first.resolve([result('Dark Side (wrong one)')]);
    await flush();

    const last = states[states.length - 1];
    expect(last).toEqual({
      kind: 'results',
      results: [result('The Dark Side of the Moon')],
    });
  });

  test('dismiss cancels the pending search and voids anything in flight', async () => {
    const inFlight = deferred<MetadataResult[]>();
    const search = jest.fn().mockReturnValue(inFlight.promise);
    const controller = createTypeahead({ adapter: makeAdapter(search), enabled: true, onState });

    // Pending debounce — dismiss drops it before it ever fires.
    controller.setQuery('abandoned');
    controller.dismiss();
    jest.advanceTimersByTime(TYPEAHEAD_DEBOUNCE_MS * 2);
    expect(search).not.toHaveBeenCalled();

    // In-flight request — dismiss invalidates the token, the late
    // resolution goes nowhere.
    controller.setQuery('abandoned again');
    jest.advanceTimersByTime(TYPEAHEAD_DEBOUNCE_MS);
    controller.dismiss();
    inFlight.resolve([result('Too Late')]);
    await flush();

    expect(states[states.length - 1]).toEqual({ kind: 'idle' });
    expect(states.some((s) => s.kind === 'results')).toBe(false);
  });

  test('in-band degradation surfaces as a muted hint, message intact', async () => {
    const search = jest
      .fn()
      .mockRejectedValue(new MetadataProxyError('daily lookup limit reached — try tomorrow or add manually', 429));
    const controller = createTypeahead({ adapter: makeAdapter(search), enabled: true, onState });

    controller.setQuery('submariner');
    jest.advanceTimersByTime(TYPEAHEAD_DEBOUNCE_MS);
    await flush();

    expect(states[states.length - 1]).toEqual({
      kind: 'hint',
      message: 'daily lookup limit reached — try tomorrow or add manually',
    });
  });

  test('unexpected errors stay quiet — popover just closes', async () => {
    const search = jest.fn().mockRejectedValue(new Error('boom'));
    const controller = createTypeahead({ adapter: makeAdapter(search), enabled: true, onState });

    controller.setQuery('anything');
    jest.advanceTimersByTime(TYPEAHEAD_DEBOUNCE_MS);
    await flush();

    expect(states).toEqual([{ kind: 'loading' }, { kind: 'idle' }]);
  });

  test('dispose is silent — no idle emission on unmount', async () => {
    const inFlight = deferred<MetadataResult[]>();
    const search = jest.fn().mockReturnValue(inFlight.promise);
    const controller = createTypeahead({ adapter: makeAdapter(search), enabled: true, onState });

    controller.setQuery('unmounting');
    jest.advanceTimersByTime(TYPEAHEAD_DEBOUNCE_MS);
    const emitted = states.length; // just the loading state

    controller.dispose();
    inFlight.resolve([result('Ghost')]);
    await flush();

    expect(states).toHaveLength(emitted);
  });
});

describe('fillFromResult', () => {
  test('maps a match exactly like the scan prefill does', () => {
    const match = result('Rolex Submariner Date', {
      subtitle: '116610LN',
      imageUrl: 'https://img.example/subby.jpg',
      fields: { brand: 'Rolex', model: 'Submariner Date', case_diameter_mm: 40 },
      source: 'TheWatchAPI',
    });

    expect(fillFromResult(match)).toEqual({
      name: 'Rolex Submariner Date',
      customFields: { brand: 'Rolex', model: 'Submariner Date', case_diameter_mm: 40 },
      imageUrl: 'https://img.example/subby.jpg',
    });
  });

  test('no cover art means no imageUrl — the save path skips it', () => {
    const fill = fillFromResult(result('Plain Match'));
    expect(fill.imageUrl).toBeUndefined();
    expect(fill.name).toBe('Plain Match');
  });
});

/**
 * Purpose: Portfolio-series math tests — stepwise per-item trails summed
 * into one day-bucketed line, plus gain/loss and the acquisition timeline.
 * Pure functions, hammered hard: baseline-only, step changes, multi-item
 * sums, same-day collapse, carry-forward, unsorted input, and the empties.
 * Author(s): John Reed
 */

import {
  buildPortfolioSeries,
  dayKey,
  dayT,
  gainLoss,
  monthBuckets,
  type BaselineItem,
  type HistoryInput,
} from '../value-series';

// Test scaffolding

const NOW = Date.parse('2026-08-17T15:30:00Z');
const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

const item = (
  id: string,
  over: Partial<BaselineItem> = {}
): BaselineItem => ({
  id,
  purchase_price_cents: 1000,
  acquired_at: '2026-01-10',
  created_at: '2026-01-15T09:00:00Z',
  ...over,
});

const hist = (
  item_id: string,
  value_cents: number,
  recorded_at: string
): HistoryInput => ({ item_id, value_cents, recorded_at });

describe('day bucketing', () => {
  test('dayKey slices both ISO and SQLite timestamp shapes', () => {
    expect(dayKey('2026-08-17T15:30:00.000Z')).toBe('2026-08-17');
    expect(dayKey('2026-08-17 15:30:00')).toBe('2026-08-17');
    expect(dayKey('2026-08-17')).toBe('2026-08-17');
  });

  test('dayT lands on UTC midnight; garbage goes NaN', () => {
    expect(dayT('2026-08-17T23:59:59Z')).toBe(day('2026-08-17'));
    expect(Number.isNaN(dayT('not a date'))).toBe(true);
  });
});

describe('buildPortfolioSeries', () => {
  test('empty everything: no items, no series', () => {
    expect(
      buildPortfolioSeries({ historyRows: [], items: [], now: NOW })
    ).toEqual([]);
  });

  test('baseline-only: purchase price from acquired_at, carried to now', () => {
    const series = buildPortfolioSeries({
      historyRows: [],
      items: [item('a', { purchase_price_cents: 2500, acquired_at: '2026-03-01' })],
      now: NOW,
    });
    expect(series).toEqual([
      { t: day('2026-03-01'), cents: 2500 },
      { t: day('2026-08-17'), cents: 2500 },
    ]);
  });

  test('acquired_at missing: created_at anchors the start', () => {
    const series = buildPortfolioSeries({
      historyRows: [],
      items: [item('a', { acquired_at: null, created_at: '2026-04-02T08:00:00Z' })],
      now: NOW,
    });
    expect(series[0]).toEqual({ t: day('2026-04-02'), cents: 1000 });
  });

  test('no purchase price: first history value is the baseline', () => {
    const series = buildPortfolioSeries({
      historyRows: [hist('a', 700, '2026-05-01T12:00:00Z')],
      items: [item('a', { purchase_price_cents: null, acquired_at: '2026-02-01' })],
      now: NOW,
    });
    // Baseline 700 applies from the acquired date, steps at its own row.
    expect(series).toEqual([
      { t: day('2026-02-01'), cents: 700 },
      { t: day('2026-05-01'), cents: 700 },
      { t: day('2026-08-17'), cents: 700 },
    ]);
  });

  test('items with no value at all contribute nothing', () => {
    const series = buildPortfolioSeries({
      historyRows: [],
      items: [
        item('ghost', { purchase_price_cents: null }),
        item('real', { purchase_price_cents: 500, acquired_at: '2026-06-01' }),
      ],
      now: NOW,
    });
    expect(series.every((p) => p.cents === 500)).toBe(true);
  });

  test('step change: history row moves the line on its day', () => {
    const series = buildPortfolioSeries({
      historyRows: [hist('a', 1500, '2026-04-10T10:00:00Z')],
      items: [item('a', { purchase_price_cents: 1000, acquired_at: '2026-01-10' })],
      now: NOW,
    });
    expect(series).toEqual([
      { t: day('2026-01-10'), cents: 1000 },
      { t: day('2026-04-10'), cents: 1500 },
      { t: day('2026-08-17'), cents: 1500 },
    ]);
  });

  test('multi-item sum: portfolio is the sum of each trail at each day', () => {
    const series = buildPortfolioSeries({
      historyRows: [
        hist('a', 2000, '2026-04-01T00:30:00Z'),
        hist('b', 300, '2026-06-01T00:30:00Z'),
      ],
      items: [
        item('a', { purchase_price_cents: 1000, acquired_at: '2026-01-01' }),
        item('b', { purchase_price_cents: 100, acquired_at: '2026-03-01' }),
      ],
      now: NOW,
    });
    expect(series).toEqual([
      { t: day('2026-01-01'), cents: 1000 }, // a alone
      { t: day('2026-03-01'), cents: 1100 }, // b arrives at cost
      { t: day('2026-04-01'), cents: 2100 }, // a steps to 2000
      { t: day('2026-06-01'), cents: 2300 }, // b steps to 300
      { t: day('2026-08-17'), cents: 2300 }, // carried forward
    ]);
  });

  test('unsorted input: rows arrive shuffled, series comes out ordered', () => {
    const series = buildPortfolioSeries({
      historyRows: [
        hist('a', 3000, '2026-07-01T00:00:00Z'),
        hist('a', 1500, '2026-03-01T00:00:00Z'),
        hist('a', 2000, '2026-05-01T00:00:00Z'),
      ],
      items: [item('a', { purchase_price_cents: 1000, acquired_at: '2026-01-01' })],
      now: NOW,
    });
    expect(series.map((p) => p.cents)).toEqual([1000, 1500, 2000, 3000, 3000]);
    const ts = series.map((p) => p.t);
    expect([...ts].sort((x, y) => x - y)).toEqual(ts);
  });

  test('same-day rows collapse: the later timestamp wins the day', () => {
    const series = buildPortfolioSeries({
      historyRows: [
        hist('a', 1200, '2026-04-10T08:00:00Z'),
        hist('a', 1400, '2026-04-10T17:00:00Z'),
      ],
      items: [item('a', { purchase_price_cents: 1000, acquired_at: '2026-01-10' })],
      now: NOW,
    });
    expect(series).toEqual([
      { t: day('2026-01-10'), cents: 1000 },
      { t: day('2026-04-10'), cents: 1400 },
      { t: day('2026-08-17'), cents: 1400 },
    ]);
  });

  test('history on the start day replaces the baseline outright', () => {
    const series = buildPortfolioSeries({
      historyRows: [hist('a', 999, '2026-01-10T12:00:00Z')],
      items: [item('a', { purchase_price_cents: 1000, acquired_at: '2026-01-10' })],
      now: NOW,
    });
    expect(series[0]).toEqual({ t: day('2026-01-10'), cents: 999 });
  });

  test('history predating the anchor pulls the start back', () => {
    const series = buildPortfolioSeries({
      historyRows: [hist('a', 800, '2025-12-01T00:00:00Z')],
      items: [item('a', { purchase_price_cents: 1000, acquired_at: '2026-01-10' })],
      now: NOW,
    });
    // The trail begins at the history row's day, never after its own step,
    // and that day's history value wins over the baseline.
    expect(series[0].t).toBe(day('2025-12-01'));
    expect(series[0].cents).toBe(800);
  });

  test('future-dated history stays off the line', () => {
    const series = buildPortfolioSeries({
      historyRows: [hist('a', 9999, '2027-01-01T00:00:00Z')],
      items: [item('a', { purchase_price_cents: 1000, acquired_at: '2026-01-10' })],
      now: NOW,
    });
    expect(series.every((p) => p.cents === 1000)).toBe(true);
    expect(series[series.length - 1].t).toBe(day('2026-08-17'));
  });

  test('no usable dates and no history: item drops out quietly', () => {
    const series = buildPortfolioSeries({
      historyRows: [],
      items: [item('a', { acquired_at: null, created_at: null })],
      now: NOW,
    });
    expect(series).toEqual([]);
  });

  test('carry-forward: last point always lands on the now day', () => {
    const series = buildPortfolioSeries({
      historyRows: [],
      items: [item('a', { acquired_at: '2026-08-17' })],
      now: NOW,
    });
    // Start day IS the now day — one point, no duplicate.
    expect(series).toEqual([{ t: day('2026-08-17'), cents: 1000 }]);
  });
});

describe('gainLoss', () => {
  test('up: positive delta and fraction', () => {
    expect(gainLoss({ value: 1500, cost: 1000 })).toEqual({
      deltaCents: 500,
      pct: 0.5,
    });
  });

  test('down: negative delta and fraction', () => {
    expect(gainLoss({ value: 750, cost: 1000 })).toEqual({
      deltaCents: -250,
      pct: -0.25,
    });
  });

  test('zero cost basis: delta rides, pct is null (no divide-by-zero)', () => {
    expect(gainLoss({ value: 500, cost: 0 })).toEqual({
      deltaCents: 500,
      pct: null,
    });
  });
});

describe('monthBuckets', () => {
  test('twelve buckets, oldest first, keyed to the trailing window', () => {
    const buckets = monthBuckets([], NOW);
    expect(buckets).toHaveLength(12);
    expect(buckets[0].key).toBe('2025-09');
    expect(buckets[11].key).toBe('2026-08');
    expect(buckets[11].label).toBe('Aug');
    expect(buckets.every((b) => b.count === 0)).toBe(true);
  });

  test('items land in their acquired month; created_at fills in', () => {
    const buckets = monthBuckets(
      [
        { acquired_at: '2026-08-02', created_at: '2026-01-01T00:00:00Z' },
        { acquired_at: null, created_at: '2026-08-10T09:00:00Z' },
        { acquired_at: '2026-03-15', created_at: null },
      ],
      NOW
    );
    expect(buckets.find((b) => b.key === '2026-08')?.count).toBe(2);
    expect(buckets.find((b) => b.key === '2026-03')?.count).toBe(1);
  });

  test('outside-the-window and undateable items drop out', () => {
    const buckets = monthBuckets(
      [
        { acquired_at: '2024-01-01', created_at: null },
        { acquired_at: null, created_at: null },
      ],
      NOW
    );
    expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(0);
  });

  test('window length is honest across a year boundary', () => {
    const buckets = monthBuckets([], Date.parse('2026-01-15T00:00:00Z'), 3);
    expect(buckets.map((b) => b.key)).toEqual(['2025-11', '2025-12', '2026-01']);
  });
});

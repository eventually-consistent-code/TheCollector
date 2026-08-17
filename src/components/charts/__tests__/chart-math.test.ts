/**
 * Purpose: Chart geometry tests — series-to-pixel scaling (including the
 * degenerate single-point and flat-line cases), polyline/area string
 * building, and the allocation fold's fixed-palette guarantees.
 * Author(s): John Reed
 */

import {
  foldAllocation,
  scaleSeries,
  toAreaPath,
  toPolyline,
} from '../chart-math';

const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

describe('scaleSeries', () => {
  test('empty data or zero box: nothing to draw', () => {
    expect(scaleSeries([], 300, 180)).toEqual([]);
    expect(scaleSeries([{ t: 1, cents: 5 }], 0, 180)).toEqual([]);
    expect(scaleSeries([{ t: 1, cents: 5 }], 300, 0)).toEqual([]);
  });

  test('two points span the width; min sits low, max sits high', () => {
    const pts = scaleSeries(
      [
        { t: day('2026-01-01'), cents: 100 },
        { t: day('2026-02-01'), cents: 200 },
      ],
      300,
      180,
      0.1
    );
    expect(pts).toHaveLength(2);
    expect(pts[0].x).toBe(0);
    expect(pts[1].x).toBe(300);
    // SVG y is inverted: the max value has the SMALLER y.
    expect(pts[1].y).toBeLessThan(pts[0].y);
    // Padding keeps both inside the frame.
    expect(pts[1].y).toBeCloseTo(18);
    expect(pts[0].y).toBeCloseTo(162);
  });

  test('single point renders as a full-width flat line at mid-height', () => {
    const pts = scaleSeries([{ t: day('2026-01-01'), cents: 500 }], 200, 100);
    expect(pts).toEqual([
      { x: 0, y: 50 },
      { x: 200, y: 50 },
    ]);
  });

  test('flat series (all equal): mid-height line, x still spreads by time', () => {
    const pts = scaleSeries(
      [
        { t: day('2026-01-01'), cents: 500 },
        { t: day('2026-01-11'), cents: 500 },
        { t: day('2026-01-21'), cents: 500 },
      ],
      200,
      100
    );
    expect(pts.map((p) => p.y)).toEqual([50, 50, 50]);
    expect(pts.map((p) => p.x)).toEqual([0, 100, 200]);
  });

  test('x lands proportionally to time, not to index', () => {
    const pts = scaleSeries(
      [
        { t: day('2026-01-01'), cents: 0 },
        { t: day('2026-01-02'), cents: 50 },
        { t: day('2026-01-11'), cents: 100 },
      ],
      100,
      100
    );
    expect(pts[1].x).toBeCloseTo(10);
  });
});

describe('polyline and area strings', () => {
  const pts = [
    { x: 0, y: 90 },
    { x: 150, y: 30 },
    { x: 300, y: 60 },
  ];

  test('toPolyline emits the SVG points attribute shape', () => {
    expect(toPolyline(pts)).toBe('0,90 150,30 300,60');
  });

  test('toAreaPath closes down to the frame floor and back', () => {
    expect(toAreaPath(pts, 180)).toBe(
      'M0 90 L150 30 L300 60 L300 180 L0 180 Z'
    );
  });

  test('empty points: empty strings, no phantom path', () => {
    expect(toPolyline([])).toBe('');
    expect(toAreaPath([], 180)).toBe('');
  });
});

describe('foldAllocation', () => {
  test('sorts largest first and assigns fixed palette slots in order', () => {
    const slices = foldAllocation([
      { label: 'Comics', cents: 200 },
      { label: 'Cards', cents: 800 },
    ]);
    expect(slices.map((s) => s.label)).toEqual(['Cards', 'Comics']);
    expect(slices.map((s) => s.colorIndex)).toEqual([0, 1]);
    expect(slices[0].frac).toBeCloseTo(0.8);
    expect(slices[1].frac).toBeCloseTo(0.2);
  });

  test('at the cap: five rows keep five slots, no fold', () => {
    const rows = ['A', 'B', 'C', 'D', 'E'].map((label, i) => ({
      label,
      cents: 500 - i * 100,
    }));
    const slices = foldAllocation(rows, 5);
    expect(slices).toHaveLength(5);
    expect(slices.map((s) => s.colorIndex)).toEqual([0, 1, 2, 3, 4]);
    expect(slices.some((s) => s.label === 'Other')).toBe(false);
  });

  test('over the cap: overflow folds into Other on the last slot', () => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((label, i) => ({
      label,
      cents: 700 - i * 100,
    }));
    const slices = foldAllocation(rows, 5);
    expect(slices).toHaveLength(5);
    expect(slices[4].label).toBe('Other');
    expect(slices[4].colorIndex).toBe(4);
    // Top four keep their slots; E + F + G = 300 + 200 + 100 fold.
    expect(slices[4].cents).toBe(600);
    // Fractions still sum to one.
    expect(slices.reduce((sum, s) => sum + s.frac, 0)).toBeCloseTo(1);
  });

  test('worthless portfolio: fractions are 0, never NaN', () => {
    const slices = foldAllocation([
      { label: 'Cards', cents: 0 },
      { label: 'Comics', cents: 0 },
    ]);
    expect(slices.map((s) => s.frac)).toEqual([0, 0]);
  });

  test('empty rows: empty slices', () => {
    expect(foldAllocation([])).toEqual([]);
  });
});

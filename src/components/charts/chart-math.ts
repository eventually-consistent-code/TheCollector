/**
 * Purpose: Pure geometry for the Insights charts — series points to SVG
 * polyline/area strings, and the allocation fold that keeps the series
 * palette honest (fixed hue order, overflow folds into "Other", never a
 * cycled color). Unit-tested standalone; the components just draw.
 * Author(s): John Reed
 */

import type { SeriesPoint } from '@/lib/value-series';

// Line geometry

export interface XY {
  x: number;
  y: number;
}

// Maps a day-bucketed series onto a width x height box, y-inverted for
// SVG, with a vertical padding fraction so the line never kisses the
// frame. Degenerate inputs stay drawable: a single point (or a flat
// series) renders as a full-width horizontal line at mid-height.
export function scaleSeries(
  data: readonly SeriesPoint[],
  width: number,
  height: number,
  padFraction = 0.12
): XY[] {
  if (data.length === 0 || width <= 0 || height <= 0) {
    return [];
  }

  // One point still draws — duplicate it across the frame (flat line).
  const series = data.length === 1 ? [data[0], data[0]] : [...data];

  const t0 = series[0].t;
  const t1 = series[series.length - 1].t;
  const tSpan = t1 - t0;

  let min = Infinity;
  let max = -Infinity;
  for (const p of series) {
    if (p.cents < min) min = p.cents;
    if (p.cents > max) max = p.cents;
  }
  const pad = height * padFraction;
  const ySpan = max - min;

  return series.map((p, i) => ({
    x: tSpan > 0 ? ((p.t - t0) / tSpan) * width : (i / (series.length - 1)) * width,
    y:
      ySpan > 0
        ? pad + (1 - (p.cents - min) / ySpan) * (height - pad * 2)
        : height / 2,
  }));
}

// Points -> the SVG Polyline `points` attribute ("x,y x,y ...").
export function toPolyline(points: readonly XY[]): string {
  return points.map((p) => `${round2(p.x)},${round2(p.y)}`).join(' ');
}

// Points -> a closed Path under the line, dropped to the frame's floor —
// the faint fill that grounds the portfolio line. Empty when nothing draws.
export function toAreaPath(points: readonly XY[], height: number): string {
  if (points.length === 0) {
    return '';
  }
  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${round2(p.x)} ${round2(p.y)}`)
    .join(' ');
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L${round2(last.x)} ${height} L${round2(first.x)} ${height} Z`;
}

// Two decimals is plenty for device pixels and keeps test strings sane.
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Allocation fold

export interface AllocationSlice {
  label: string;
  cents: number;
  // Fraction of the whole (0..1); 0 when the portfolio is worthless.
  frac: number;
  // Index into the fixed series palette — never cycles.
  colorIndex: number;
}

// Folds a value breakdown into at most `maxSlices` rows: largest first,
// each wearing its own fixed palette slot, and everything past the last
// slot summed into one "Other" row wearing the final slot. Zero-value
// rows still show (a shelf can be counted but unappraised).
export function foldAllocation(
  rows: readonly { label: string; cents: number }[],
  maxSlices = 5
): AllocationSlice[] {
  const sorted = [...rows].sort((a, b) => b.cents - a.cents);
  const total = sorted.reduce((sum, r) => sum + r.cents, 0);
  const frac = (cents: number) => (total > 0 ? cents / total : 0);

  if (sorted.length <= maxSlices) {
    return sorted.map((r, i) => ({
      label: r.label,
      cents: r.cents,
      frac: frac(r.cents),
      colorIndex: i,
    }));
  }

  const kept = sorted.slice(0, maxSlices - 1);
  const restCents = sorted
    .slice(maxSlices - 1)
    .reduce((sum, r) => sum + r.cents, 0);
  return [
    ...kept.map((r, i) => ({
      label: r.label,
      cents: r.cents,
      frac: frac(r.cents),
      colorIndex: i,
    })),
    {
      label: 'Other',
      cents: restCents,
      frac: frac(restCents),
      colorIndex: maxSlices - 1,
    },
  ];
}

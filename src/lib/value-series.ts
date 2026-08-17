/**
 * Purpose: Pure portfolio-series math for the Insights tab — per-item
 * stepwise value over time summed into one day-bucketed line, plus the
 * gain/loss and acquisition-timeline helpers. No db, no React; hooks feed
 * rows in and the chart draws what comes out.
 * Author(s): John Reed
 */

// Types

// One point on the portfolio line — t is ms since epoch at the day's UTC
// midnight, cents is the whole archive's value on that day.
export interface SeriesPoint {
  t: number;
  cents: number;
}

// The slice of a value-history row the series needs.
export interface HistoryInput {
  item_id: string;
  value_cents: number;
  recorded_at: string;
}

// The slice of an item row the series needs — baseline price and the two
// timestamps that can anchor its start.
export interface BaselineItem {
  id: string;
  purchase_price_cents: number | null;
  acquired_at: string | null;
  created_at: string | null;
}

// Day bucketing

// ISO-ish timestamp -> its UTC day key ("2026-08-17"). Handles both the
// app's toISOString() rows and SQLite's "YYYY-MM-DD HH:MM:SS" test rows.
export function dayKey(ts: string): string {
  return ts.slice(0, 10);
}

// Day key -> ms since epoch at that day's UTC midnight; NaN for garbage.
export function dayT(ts: string): number {
  return Date.parse(`${dayKey(ts)}T00:00:00Z`);
}

// Portfolio series

// One item's internal step trail: value_cents in force from each day on.
interface ItemSteps {
  // Ascending day timestamps; parallel to values.
  days: number[];
  values: number[];
}

// The item's value on one day — last step at-or-before the day, 0 before
// its first step (the item didn't exist in the portfolio yet).
function valueAt(steps: ItemSteps, day: number): number {
  let v = 0;
  for (let i = 0; i < steps.days.length; i++) {
    if (steps.days[i] <= day) {
      v = steps.values[i];
    } else {
      break;
    }
  }
  return v;
}

// Builds the whole-portfolio value line. Each item contributes its
// purchase_price_cents (or, lacking one, its first history value) starting
// at acquired_at/created_at, then steps at each of its history rows; the
// portfolio is the sum of every item's step function, evaluated at each
// day anything changed, carried forward to `now`. Input order never
// matters — history is sorted here. Items with no price and no history
// contribute nothing.
export function buildPortfolioSeries({
  historyRows,
  items,
  now,
}: {
  historyRows: readonly HistoryInput[];
  items: readonly BaselineItem[];
  now: Date | number;
}): SeriesPoint[] {
  const nowDay = dayT(new Date(now).toISOString());

  // Group history per item, sorted by day then raw timestamp so the last
  // write on a day wins regardless of input order or timestamp format.
  const byItem = new Map<string, HistoryInput[]>();
  for (const row of historyRows) {
    const list = byItem.get(row.item_id);
    if (list) {
      list.push(row);
    } else {
      byItem.set(row.item_id, [row]);
    }
  }
  for (const list of byItem.values()) {
    list.sort((a, b) => {
      const da = dayT(a.recorded_at);
      const db = dayT(b.recorded_at);
      if (da !== db) {
        return da - db;
      }
      return a.recorded_at < b.recorded_at ? -1 : a.recorded_at > b.recorded_at ? 1 : 0;
    });
  }

  // Per-item step trails.
  const trails: ItemSteps[] = [];
  for (const item of items) {
    const hist = (byItem.get(item.id) ?? []).filter(
      (h) => Number.isFinite(dayT(h.recorded_at))
    );
    const baseline = item.purchase_price_cents ?? hist[0]?.value_cents ?? null;
    if (baseline === null) {
      // No price, no history — the item contributes 0 forever.
      continue;
    }

    // Start day: acquired_at first, created_at as the fallback anchor; a
    // history row that somehow predates both pulls the start back so the
    // trail never begins after its own first step.
    const anchor = item.acquired_at ?? item.created_at;
    let start = anchor !== null ? dayT(anchor) : NaN;
    const firstHist = hist.length ? dayT(hist[0].recorded_at) : NaN;
    if (!Number.isFinite(start)) {
      start = firstHist;
    } else if (Number.isFinite(firstHist) && firstHist < start) {
      start = firstHist;
    }
    if (!Number.isFinite(start)) {
      continue;
    }

    // Baseline first, then history steps collapsed to last-per-day; a
    // history row on the start day replaces the baseline outright.
    const days: number[] = [start];
    const values: number[] = [baseline];
    for (const h of hist) {
      const d = dayT(h.recorded_at);
      if (d > nowDay) {
        // Future-dated rows wait their turn — the line ends at now.
        continue;
      }
      if (days[days.length - 1] === d) {
        values[values.length - 1] = h.value_cents;
      } else {
        days.push(d);
        values.push(h.value_cents);
      }
    }
    trails.push({ days, values });
  }

  if (trails.length === 0) {
    return [];
  }

  // Every day anything stepped, clamped to now, plus now itself for the
  // carry-forward tail.
  const daySet = new Set<number>();
  for (const trail of trails) {
    for (const d of trail.days) {
      if (d <= nowDay) {
        daySet.add(d);
      }
    }
  }
  daySet.add(nowDay);

  const days = [...daySet].sort((a, b) => a - b);
  return days.map((d) => ({
    t: d,
    cents: trails.reduce((sum, trail) => sum + valueAt(trail, d), 0),
  }));
}

// Gain / loss

export interface GainLoss {
  // Positive when the portfolio is up on its cost basis.
  deltaCents: number;
  // Fractional gain (0.25 = +25%); null when the cost basis is 0.
  pct: number | null;
}

// Current value vs. cost basis, both in cents.
export function gainLoss({ value, cost }: { value: number; cost: number }): GainLoss {
  const deltaCents = value - cost;
  return { deltaCents, pct: cost > 0 ? deltaCents / cost : null };
}

// Acquisition timeline

export interface MonthBucket {
  // "2026-08" — the bucket's UTC year-month.
  key: string;
  // Short month label for the axis ("Aug").
  label: string;
  count: number;
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

// Items-per-month for the trailing `months` window ending at `now`,
// oldest bucket first. Each item lands in the month of its acquired_at
// (created_at when unset); items outside the window or undateable drop out.
export function monthBuckets(
  items: readonly Pick<BaselineItem, 'acquired_at' | 'created_at'>[],
  now: Date | number,
  months = 12
): MonthBucket[] {
  const end = new Date(now);
  const endYear = end.getUTCFullYear();
  const endMonth = end.getUTCMonth();

  const buckets: MonthBucket[] = [];
  const index = new Map<string, number>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(endYear, endMonth - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    index.set(key, buckets.length);
    buckets.push({ key, label: MONTH_LABELS[d.getUTCMonth()], count: 0 });
  }

  for (const item of items) {
    const anchor = item.acquired_at ?? item.created_at;
    if (!anchor) {
      continue;
    }
    const key = anchor.slice(0, 7);
    const at = index.get(key);
    if (at !== undefined) {
      buckets[at].count += 1;
    }
  }

  return buckets;
}

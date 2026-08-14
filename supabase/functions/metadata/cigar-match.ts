/**
 * Purpose: Cigar fuzzy matcher — pure TS, no I/O, no platform globals, so
 * the exact same code runs in the Deno edge function AND the client bundle
 * (which is why it lives here instead of src/: the edge bundler cannot
 * reach outside supabase/functions, but Metro can reach anywhere).
 * Matches a noisy UPC product title (or a typed query) against the curated
 * seed dataset: brand first, then line, then vitola.
 * Author(s): John Reed
 */

// Constants

// One row of the curated seed dataset (cigars-data.json).
export interface CigarEntry {
  brand: string;
  line: string;
  vitola: string;
  wrapper: string;
  binder: string;
  filler: string;
  ring_gauge: number;
  length_inches: number;
  country: string;
  release_year: number | null;
}

export interface CigarMatch {
  entry: CigarEntry;
  // 0..1 — brand carries half the weight, line a third, vitola the rest.
  confidence: number;
  // Parsed from the title when present ("Box of 25" → 25).
  boxCount?: number;
}

// Below this, a title match is a guess, not a match — caller falls back
// to manual entry with the raw title.
export const CIGAR_CONFIDENCE_FLOOR = 0.6;

// Field weights: brand is the anchor, vitola is a nice-to-have.
const W_BRAND = 0.5;
const W_LINE = 0.3;
const W_VITOLA = 0.2;

const MAX_SEARCH_RESULTS = 20;

// Helpers

// Lowercase, strip accents (Padrón → padron), split on anything that is not
// a letter or digit, and knock trailing plurals off ("churchills" →
// "churchill") so both sides tokenize identically.
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0)
    .map((t) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t));
}

// One needle token counts as found on an exact hit, or a prefix hit when
// both sides are long enough to mean something ("opus" ↔ "opusx").
function tokenFound(token: string, hay: readonly string[]): boolean {
  for (const h of hay) {
    if (h === token) return true;
    if (token.length >= 4 && h.length >= 4 && (h.startsWith(token) || token.startsWith(h))) {
      return true;
    }
  }
  return false;
}

// Fraction of needle tokens present in the hay (0..1; empty needle → 0).
function coverage(needle: readonly string[], hay: readonly string[]): number {
  if (needle.length === 0) return 0;
  let found = 0;
  for (const token of needle) {
    if (tokenFound(token, hay)) found += 1;
  }
  return found / needle.length;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Main

// Pulls a box/pack count out of retail titles: "Box of 25", "5 Pack",
// "25 Count", "20ct". Anything outside 1..100 is noise, not a box.
export function parseBoxCount(title: string): number | undefined {
  const text = title.toLowerCase();
  const patterns = [
    /\b(?:box|pack|tin|bundle|sleeve)\s*of\s*(\d{1,3})\b/,
    /\b(\d{1,3})\s*-?\s*(?:count|ct|pack|pk)\b/,
  ];

  for (const pattern of patterns) {
    const hit = text.match(pattern);
    if (hit) {
      const count = Number(hit[1]);
      if (count >= 1 && count <= 100) return count;
    }
  }
  return undefined;
}

// Best dataset row for a UPC-resolved product title. Brand gates the
// candidates (at least half its tokens must appear), line and vitola refine
// the score; anything under the confidence floor returns null.
export function matchCigarTitle(
  title: string,
  entries: readonly CigarEntry[]
): CigarMatch | null {
  const hay = tokenize(title);
  if (hay.length === 0) return null;

  let best: CigarMatch | null = null;
  let bestBrand = 0;

  for (const entry of entries) {
    const brandScore = coverage(tokenize(entry.brand), hay);
    if (brandScore < 0.5) continue;

    const lineScore = coverage(tokenize(entry.line), hay);
    const vitolaScore = coverage(tokenize(entry.vitola), hay);
    const confidence = W_BRAND * brandScore + W_LINE * lineScore + W_VITOLA * vitolaScore;

    // Strictly-better keeps the first (dataset-order) row on ties —
    // deterministic output for identical scores.
    const better =
      !best ||
      confidence > best.confidence ||
      (confidence === best.confidence && brandScore > bestBrand);
    if (better) {
      best = { entry, confidence };
      bestBrand = brandScore;
    }
  }

  if (!best || best.confidence < CIGAR_CONFIDENCE_FLOOR) return null;

  const boxCount = parseBoxCount(title);
  return {
    entry: best.entry,
    confidence: round2(best.confidence),
    ...(boxCount !== undefined ? { boxCount } : {}),
  };
}

// Ranked text search over the seed for typed queries ("padron 1964").
// Score = how much of the query the row explains × which fields it hit —
// so a full brand+line hit beats a stray vitola word every time.
export function searchCigars(
  query: string,
  entries: readonly CigarEntry[],
  limit = MAX_SEARCH_RESULTS
): CigarMatch[] {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];

  const scored: { match: CigarMatch; index: number }[] = [];

  entries.forEach((entry, index) => {
    const brandTokens = tokenize(entry.brand);
    const lineTokens = tokenize(entry.line);
    const vitolaTokens = tokenize(entry.vitola);

    const queryCoverage = coverage(qTokens, [...brandTokens, ...lineTokens, ...vitolaTokens]);
    if (queryCoverage === 0) return;

    const fieldScore =
      W_BRAND * coverage(brandTokens, qTokens) +
      W_LINE * coverage(lineTokens, qTokens) +
      W_VITOLA * coverage(vitolaTokens, qTokens);
    if (fieldScore === 0) return;

    scored.push({ match: { entry, confidence: round2(queryCoverage * fieldScore) }, index });
  });

  scored.sort((a, b) => b.match.confidence - a.match.confidence || a.index - b.index);
  return scored.slice(0, limit).map((s) => s.match);
}

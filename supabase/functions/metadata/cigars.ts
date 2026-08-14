/**
 * Purpose: Cigars source for the metadata proxy. No clean cigar API exists
 * (locked decision), so this is the bourbon playbook inverted: a curated
 * seed dataset + fuzzy matching. Digit queries ride the shared upc_cache /
 * UPCitemdb bridge to a product title, then fuzzy-match that title against
 * the seed; text queries search the seed directly (local, no cache needed).
 * Author(s): John Reed
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

import { matchCigarTitle, searchCigars, type CigarEntry } from './cigar-match.ts';
import seedJson from './cigars-data.json' with { type: 'json' };

// Constants

const SEED = seedJson as CigarEntry[];

// What the router turns into a Response — body + status, CORS stays its job.
export interface SourceResult {
  status: number;
  body: unknown;
}

// Helpers

function bad(status: number, message: string): SourceResult {
  return { status, body: { error: message } };
}

function secret(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing secret: ${name}`);
  return value;
}

// UPC → product title through the shared upc_cache table, UPCitemdb on a
// miss — the same cache upcBridge fronts, so every barcode costs at most
// one upstream call regardless of which source asked first.
async function resolveUpcTitle(upc: string): Promise<SourceResult | { title: string }> {
  const admin = createClient(secret('SUPABASE_URL'), secret('SUPABASE_SERVICE_ROLE_KEY'));

  const { data: cached } = await admin
    .from('upc_cache')
    .select('title')
    .eq('upc', upc)
    .maybeSingle();
  if (cached?.title) return { title: cached.title };

  const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${upc}`);
  if (response.status === 429) return bad(429, 'upc bridge rate-limited — try later');
  if (!response.ok) return bad(response.status, `upc bridge ${response.status}`);

  const body = await response.json();
  const item = body.items?.[0];
  if (!item?.title) return bad(404, 'unknown barcode');

  // Best-effort insert — a lost race just means the other writer won.
  await admin
    .from('upc_cache')
    .upsert({ upc, title: item.title, brand: item.brand ?? null, payload: item })
    .select()
    .maybeSingle();

  return { title: item.title };
}

// Main

// op 'lookup' (or a 12-13 digit q) → UPC → title → fuzzy match; anything
// else is a text search over the seed. Match may be null — the title alone
// still helps the client prefill manual entry.
export async function cigars(op: string, params: Record<string, string>): Promise<SourceResult> {
  const q = (params.q ?? '').trim();
  const upc = params.upc ?? (/^\d{12,13}$/.test(q) ? q : '');

  if (op === 'lookup' || upc) {
    if (!/^\d{12,13}$/.test(upc)) return bad(400, 'bad upc');

    const resolved = await resolveUpcTitle(upc);
    if (!('title' in resolved)) return resolved;

    const match = matchCigarTitle(resolved.title, SEED);
    return {
      status: 200,
      body: {
        title: resolved.title,
        match: match?.entry ?? null,
        confidence: match?.confidence ?? 0,
        box_count: match?.boxCount ?? null,
      },
    };
  }

  const results = searchCigars(q, SEED).map((m) => ({ ...m.entry, confidence: m.confidence }));
  return { status: 200, body: { results } };
}

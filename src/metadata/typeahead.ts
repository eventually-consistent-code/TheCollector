/**
 * Purpose: Type-ahead lookup controller for the add-item name field —
 * trigger rules (min chars, trailing debounce), a sequence guard so stale
 * responses never overwrite newer ones, and the pick-to-fill mapping that
 * mirrors the scan screen's prefill. Pure timers + promises, no react, so
 * it unit-tests standalone with fake timers.
 * Author(s): John Reed
 */

import { debounce } from '@/lib/debounce';
import type { FieldValues } from '@/templates/types';

import { MetadataProxyError } from './proxy';
import type { MetadataAdapter, MetadataResult } from './types';

// Constants

// Don't bother the sources until the query looks like a real title.
export const TYPEAHEAD_MIN_CHARS = 3;
// Trailing-edge quiet window — long enough to skip most mid-word states.
export const TYPEAHEAD_DEBOUNCE_MS = 600;
// The popover shows a short list, not a search page.
export const TYPEAHEAD_MAX_RESULTS = 5;

// What the popover renders at any moment. `idle` means closed.
export type TypeaheadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'results'; results: MetadataResult[] }
  // Quota/key degradation — a muted hint row, never an error card.
  | { kind: 'hint'; message: string };

export interface TypeaheadController {
  // Feed every keystroke here; the controller decides when to search.
  setQuery: (raw: string) => void;
  // Close the popover and drop anything pending or in flight.
  dismiss: () => void;
  // Unmount cleanup — like dismiss, but silent (no state emission).
  dispose: () => void;
}

// Main

// Builds the controller. No adapter for the vertical, or an edit-mode form
// (`enabled: false`), returns an inert controller — no timers, no
// emissions, the feature simply is not there.
export function createTypeahead({
  adapter,
  enabled,
  onState,
  debounceMs = TYPEAHEAD_DEBOUNCE_MS,
}: {
  adapter: MetadataAdapter | undefined;
  enabled: boolean;
  onState: (state: TypeaheadState) => void;
  debounceMs?: number;
}): TypeaheadController {
  if (!adapter || !enabled) {
    const noop = () => {};
    return { setQuery: noop, dismiss: noop, dispose: noop };
  }

  // Sequence guard — a response only lands while it is still the newest
  // ask; anything older resolves into the void.
  let seq = 0;

  const run = async (query: string) => {
    const token = ++seq;
    onState({ kind: 'loading' });

    try {
      const results = await adapter.searchByText(query);
      if (token !== seq) return;
      if (results.length === 0) {
        onState({ kind: 'idle' });
        return;
      }
      onState({ kind: 'results', results: results.slice(0, TYPEAHEAD_MAX_RESULTS) });
    } catch (error) {
      if (token !== seq) return;
      // In-band degradation (quota spent, key missing, offline) reads as a
      // friendly hint; anything else stays quiet — the type-ahead is a
      // convenience, never a gate on manual entry.
      if (error instanceof MetadataProxyError) {
        onState({ kind: 'hint', message: error.message });
      } else {
        onState({ kind: 'idle' });
      }
    }
  };

  const debounced = debounce((query: string) => {
    void run(query);
  }, debounceMs);

  const dismiss = () => {
    debounced.cancel();
    seq += 1;
    onState({ kind: 'idle' });
  };

  const setQuery = (raw: string) => {
    const query = raw.trim();
    // Cleared or too short — close up shop (covers "name field cleared").
    if (query.length < TYPEAHEAD_MIN_CHARS) {
      dismiss();
      return;
    }
    debounced(query);
  };

  const dispose = () => {
    debounced.cancel();
    seq += 1;
  };

  return { setQuery, dismiss, dispose };
}

// Pick-to-fill — the exact shape scan.tsx encodes into its prefill param
// (title → name, template fields → customFields, cover art rides along).
// Only real web urls belong in an <Image> — sentinel refs (cardsight-image:*)
// exist for the save path and would just render a broken thumb.
export function isRenderableImageUrl(url: string | undefined): url is string {
  return !!url && url.startsWith('http');
}

export function fillFromResult(result: MetadataResult): {
  name: string;
  customFields: FieldValues;
  imageUrl?: string;
} {
  return {
    name: result.title,
    customFields: result.fields,
    imageUrl: result.imageUrl,
  };
}

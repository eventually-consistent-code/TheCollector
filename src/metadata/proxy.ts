/**
 * Purpose: Client side of the `metadata` edge function — one typed call for
 * every keyed source (Discogs, IGDB, TMDB, Comic Vine, Rebrickable, UPC
 * bridge). Secrets never ship in the bundle; the function holds them.
 * Author(s): John Reed
 */

import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';

import { supabase } from '@/auth/client';

// Constants

// Sources the edge function routes on (keep in lockstep with
// supabase/functions/metadata/index.ts).
export type ProxySource =
  | 'discogs'
  | 'igdb'
  | 'omdb'
  | 'comicvine'
  | 'rebrickable'
  | 'cardsight'
  | 'books'
  | 'upc';

export interface ProxyRequest {
  source: ProxySource;
  op: 'search' | 'lookup';
  params: Record<string, string>;
}

export class MetadataProxyError extends Error {
  constructor(
    message: string,
    // Upstream/relay HTTP status when known; 0 for network failures.
    readonly status: number
  ) {
    super(message);
    this.name = 'MetadataProxyError';
  }
}

// Main

// Invokes the edge function and unwraps the supabase-js error taxonomy into
// one throwable the adapters can show to a human.
export async function callMetadata<T>(request: ProxyRequest): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('metadata', {
    body: request,
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const status = error.context?.status ?? 500;
      let detail = '';
      try {
        const body = await error.context.json();
        detail = body?.error ?? '';
      } catch {
        // Non-JSON error body — status alone tells the story.
      }
      throw new MetadataProxyError(detail || `metadata lookup failed (${status})`, status);
    }
    if (error instanceof FunctionsRelayError) {
      throw new MetadataProxyError('metadata relay failed', 502);
    }
    if (error instanceof FunctionsFetchError) {
      throw new MetadataProxyError('offline — metadata lookup needs a connection', 0);
    }
    throw error;
  }

  if (data == null) {
    throw new MetadataProxyError('metadata lookup returned nothing', 500);
  }

  return data;
}

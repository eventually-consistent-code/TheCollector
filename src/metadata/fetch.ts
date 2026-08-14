/**
 * Purpose: Tiny fetch helper for the keyless direct-from-client sources
 * (Scryfall, Pokémon TCG, Open Food Facts). Keyed sources go through
 * proxy.ts instead — never here.
 * Author(s): John Reed
 */

import { MetadataProxyError } from './proxy';

// Constants

// Scryfall asks for an accurate User-Agent; browsers strip it (theirs wins),
// native sends it fine. Harmless everywhere.
const USER_AGENT = 'TheCollector/0.1 (+https://github.com/eventually-consistent-code/TheCollector)';

// Main

// GET a JSON endpoint; non-2xx or network failure become MetadataProxyError
// so adapters surface one error shape regardless of path taken.
export async function directGet<T>(url: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    });
  } catch {
    throw new MetadataProxyError('offline — metadata lookup needs a connection', 0);
  }

  if (!response.ok) {
    throw new MetadataProxyError(`lookup failed (${response.status})`, response.status);
  }

  return (await response.json()) as T;
}

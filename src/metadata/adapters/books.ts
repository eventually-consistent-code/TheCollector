/**
 * Purpose: Books adapter — Open Library (with a server-side Google Books
 * fallback) through the metadata edge function. Bookland EANs (978/979) ARE
 * ISBNs, so those barcodes hit the ISBN index directly; any other barcode
 * defers to the UPC bridge. Edition/printing is NEVER auto-filled — the
 * collector asserts it; no auto-detection survives real title pages.
 * Author(s): John Reed
 */

import type { FieldValues } from '@/templates/types';

import { callMetadata } from '../proxy';
import type { MetadataAdapter, MetadataResult } from '../types';

// The normalized hit shape the edge fn's books source returns — both
// upstreams are flattened server-side, so this is the only format here.
interface BookHit {
  title: string;
  authors?: string[];
  publisher?: string;
  publish_date?: string;
  isbn?: string;
  cover_url?: string;
  source?: string;
}

interface BooksResponse {
  results?: BookHit[];
}

// Bookland: every ISBN-13 lives under EAN prefix 978 or 979 — the scan
// routing test for "is this barcode a book?".
export function isIsbnBarcode(value: string): boolean {
  return /^97[89]\d{10}$/.test(value);
}

function mapBook(hit: BookHit): MetadataResult {
  const fields: FieldValues = {};

  const author = (hit.authors ?? []).filter(Boolean).join(', ');
  if (author) fields.author = author;
  if (hit.publisher) fields.publisher = hit.publisher;
  if (hit.publish_date) fields.publish_date = hit.publish_date;
  if (hit.isbn) fields.isbn = hit.isbn;
  // edition_printing intentionally untouched — collector-asserted only.

  return {
    title: hit.title,
    subtitle: author || undefined,
    imageUrl: hit.cover_url || undefined,
    fields,
    source: hit.source ?? 'Open Library',
  };
}

export const booksAdapter: MetadataAdapter = {
  templateId: 'books',

  async searchByText(query) {
    const data = await callMetadata<BooksResponse>({
      source: 'books',
      op: 'search',
      params: { q: query },
    });
    return (data.results ?? []).map(mapBook);
  },

  async lookupByBarcode(barcode) {
    // Non-Bookland EANs are not ISBNs — return empty so scanLookup falls
    // through to the UPC bridge instead of asking Open Library nonsense.
    if (!isIsbnBarcode(barcode)) return [];

    const data = await callMetadata<BooksResponse>({
      source: 'books',
      op: 'lookup',
      params: { isbn: barcode },
    });
    return (data.results ?? []).map(mapBook);
  },
};

/**
 * Purpose: Funko adapter — static dataset (kennymkchan/funko-pop-data,
 * trimmed by scripts/fetch-funko-data.mjs), searched in-memory. No UPC field
 * upstream, so text search only; the dataset lazy-loads on first search.
 * Author(s): John Reed
 */

import type { MetadataAdapter, MetadataResult } from '../types';

// Constants

const MAX_RESULTS = 20;

// Trimmed entry: t = title, s = primary series.
interface FunkoEntry {
  t: string;
  s: string;
}

// Variables

let dataset: FunkoEntry[] | null = null;

// Main

// Metro bundles the JSON; the require stays inside the function so the
// 1.1 MB payload only parses when a funko collection actually searches.
function loadDataset(): FunkoEntry[] {
  if (!dataset) {
    dataset = require('../data/funko.json') as FunkoEntry[];
  }
  return dataset;
}

function mapEntry(entry: FunkoEntry): MetadataResult {
  return {
    title: entry.t,
    subtitle: entry.s || undefined,
    fields: entry.s ? { series: entry.s } : {},
    source: 'Funko dataset',
  };
}

export const funkoAdapter: MetadataAdapter = {
  templateId: 'funko',

  async searchByText(query) {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    // Title-prefix hits rank above anywhere-in-title, series hits last.
    const titlePrefix: FunkoEntry[] = [];
    const titleContains: FunkoEntry[] = [];
    const seriesContains: FunkoEntry[] = [];

    for (const entry of loadDataset()) {
      const title = entry.t.toLowerCase();
      if (title.startsWith(needle)) {
        titlePrefix.push(entry);
      } else if (title.includes(needle)) {
        titleContains.push(entry);
      } else if (entry.s && entry.s.toLowerCase().includes(needle)) {
        seriesContains.push(entry);
      }
      if (titlePrefix.length >= MAX_RESULTS) break;
    }

    return [...titlePrefix, ...titleContains, ...seriesContains]
      .slice(0, MAX_RESULTS)
      .map(mapEntry);
  },
};

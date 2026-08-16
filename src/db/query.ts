/**
 * Purpose: Pure query-building logic for the local read layer — sort enum to
 * ORDER BY strings, LIKE-safe search SQL, and the template-driven filter
 * compiler. No db imports here; everything is unit-testable standalone, and
 * hooks.ts feeds the output straight into PowerSync watch queries.
 * Author(s): John Reed
 */

import type { FieldDef } from '../templates';

//*************************************************************************
// Sorting
//*************************************************************************

// Every way a collection's item list can be ordered.
export type ItemSort =
  | 'name_asc'
  | 'name_desc'
  | 'newest'
  | 'oldest'
  | 'value_desc'
  | 'value_asc'
  | 'acquired_desc';

export const DEFAULT_SORT: ItemSort = 'newest';

// SQLite treats NULL as smallest, so a plain DESC would float NULLs around
// inconsistently; the leading `(col IS NULL)` term pins them last either way.
const SORT_ORDER_BY: Record<ItemSort, string> = {
  name_asc: 'name COLLATE NOCASE ASC',
  name_desc: 'name COLLATE NOCASE DESC',
  newest: 'created_at DESC',
  oldest: 'created_at ASC',
  value_desc: '(current_value_cents IS NULL), current_value_cents DESC',
  value_asc: '(current_value_cents IS NULL), current_value_cents ASC',
  acquired_desc: '(acquired_at IS NULL), acquired_at DESC',
};

// Sort key -> the exact ORDER BY body (no "ORDER BY" prefix).
export function orderByFor(sort: ItemSort): string {
  return SORT_ORDER_BY[sort];
}

//*************************************************************************
// First-photo thumbnail
//*************************************************************************

// Correlated scalar subquery: one photo's local_uri per item, riding along
// on the list/search SELECTs as `thumb_uri`. One statement for the whole
// list — no per-row hook, no N+1 query storm — and PowerSync's watch picks
// up the photos/attachments tables from the plan, so rows go live when a
// photo lands. "First" mirrors the item screen's photo grid (newest first),
// with one twist: photos whose attachment has no local_uri yet can't render,
// so anything renderable sorts ahead of them instead of showing a blank.
export const FIRST_PHOTO_URI_SQL =
  `(SELECT a.local_uri FROM photos p ` +
  `LEFT JOIN attachments a ON a.id = p.id ` +
  `WHERE p.item_id = items.id ` +
  `ORDER BY (a.local_uri IS NULL), p.created_at DESC LIMIT 1)`;

//*************************************************************************
// Search
//*************************************************************************

// Escape LIKE wildcards in user input so "100%" matches literally.
// Pair with `LIKE ? ESCAPE '\'` — backslash first, then % and _.
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

// Cross-collection search: item name, notes, and custom-field VALUES (never
// keys — json_each.value only), joined to collections so results can carry
// the collection's name + vertical for labeling.
// Returns null for empty/whitespace queries — caller skips the db entirely.
export function buildSearchQuery(
  raw: string
): { sql: string; params: string[] } | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const like = `%${escapeLike(trimmed)}%`;
  const sql =
    `SELECT items.*, ` +
    `collections.name AS collection_name, ` +
    `collections.vertical AS collection_vertical, ` +
    `${FIRST_PHOTO_URI_SQL} AS thumb_uri ` +
    `FROM items ` +
    `JOIN collections ON collections.id = items.collection_id ` +
    `WHERE items.name LIKE ? ESCAPE '\\' ` +
    `OR (items.notes IS NOT NULL AND items.notes LIKE ? ESCAPE '\\') ` +
    `OR (items.custom_fields IS NOT NULL AND items.custom_fields != '' ` +
    `AND EXISTS (SELECT 1 FROM json_each(items.custom_fields) ` +
    `WHERE json_each.value LIKE ? ESCAPE '\\')) ` +
    `OR (json_valid(items.tags) ` +
    `AND EXISTS (SELECT 1 FROM json_each(items.tags) ` +
    `WHERE json_each.value LIKE ? ESCAPE '\\')) ` +
    `ORDER BY items.name COLLATE NOCASE ASC`;

  return { sql, params: [like, like, like, like] };
}

//*************************************************************************
// Filter compiler
//*************************************************************************

// A number/money filter — either side optional; both absent means inactive.
export interface NumberRange {
  min?: number;
  max?: number;
}

// Active value for one template field, keyed by FieldDef.key in FilterState.
// select -> string, boolean -> boolean, number/money -> NumberRange.
export type FieldFilterValue = string | boolean | NumberRange;

export interface FilterState {
  // Per-field active filters; keys are FieldDef.key.
  fields?: Record<string, FieldFilterValue | undefined>;
  // Item must carry every listed tag (lowercase strings in items.tags JSON).
  tags?: readonly string[];
}

// Compiled WHERE fragment — clauses already AND-joined, ready to append to a
// base query as `AND (${sql})` when sql is non-empty.
export interface CompiledFilter {
  sql: string;
  params: unknown[];
}

// Template keys are code-owned constants; still, never let a stray key ride
// into an embedded JSON path unchecked.
const SAFE_KEY = /^[A-Za-z0-9_]+$/;

// Compile the active filter state against a template's field defs into
// parameterized WHERE fragments. Pure — no db, no side effects.
export function compileFilters(
  defs: readonly FieldDef[],
  state: FilterState
): CompiledFilter {
  const clauses: string[] = [];
  const params: unknown[] = [];

  // Field filters, in template-def order so output is deterministic.
  for (const def of defs) {
    const value = state.fields?.[def.key];
    if (value === undefined) {
      continue;
    }
    if (!SAFE_KEY.test(def.key)) {
      throw new Error(`compileFilters: unsafe field key "${def.key}"`);
    }

    // Bare json_extract throws "malformed JSON" on rows whose custom_fields
    // is '' — the json_valid CASE guard turns those into a quiet non-match.
    const extract =
      `(CASE WHEN json_valid(custom_fields) ` +
      `THEN json_extract(custom_fields, '$.${def.key}') END)`;

    switch (def.type) {
      case 'select': {
        if (typeof value === 'string') {
          clauses.push(`${extract} = ?`);
          params.push(value);
        }
        break;
      }

      case 'boolean': {
        if (typeof value === 'boolean') {
          // JSON booleans come back from json_extract as 1/0.
          clauses.push(`${extract} = ?`);
          params.push(value ? 1 : 0);
        }
        break;
      }

      case 'number':
      case 'money': {
        if (typeof value === 'object' && value !== null) {
          if (value.min !== undefined) {
            clauses.push(`${extract} >= ?`);
            params.push(value.min);
          }
          if (value.max !== undefined) {
            clauses.push(`${extract} <= ?`);
            params.push(value.max);
          }
        }
        break;
      }

      // text/date fields filter through search, not here.
      default:
        break;
    }
  }

  // Tag filters — one EXISTS per tag, all must match. json_valid-guarded:
  // items created before tagging shipped carry NULL tags, and json_each
  // hard-errors on NULL/''/garbage instead of quietly matching nothing.
  for (const tag of state.tags ?? []) {
    clauses.push(
      `(json_valid(items.tags) AND EXISTS ` +
        `(SELECT 1 FROM json_each(items.tags) WHERE json_each.value = ?))`
    );
    params.push(tag.toLowerCase());
  }

  return { sql: clauses.join(' AND '), params };
}

//*************************************************************************
// Collection item list — filter + sort in one statement
//*************************************************************************

// Everything the collection screen's filter bar can layer onto its list:
// compiled template/tag filters plus an item-level current-value range
// (current_value_cents is a real column, not a template field).
export interface ItemListFilter {
  compiled?: CompiledFilter;
  value?: NumberRange;
}

// Full SELECT for one collection's item list with filters + sort applied,
// plus each row's first-photo thumb_uri (see FIRST_PHOTO_URI_SQL). Pure —
// collectionId rides in params, never in the SQL string.
export function buildItemsQuery(
  collectionId: string | null,
  sort: ItemSort,
  filter?: ItemListFilter
): { sql: string; params: unknown[] } {
  const clauses = ['collection_id = ?'];
  const params: unknown[] = [collectionId];

  // Value range first, compiled fragment last — params track clause order.
  if (filter?.value?.min !== undefined) {
    clauses.push('current_value_cents >= ?');
    params.push(filter.value.min);
  }
  if (filter?.value?.max !== undefined) {
    clauses.push('current_value_cents <= ?');
    params.push(filter.value.max);
  }
  if (filter?.compiled && filter.compiled.sql !== '') {
    clauses.push(`(${filter.compiled.sql})`);
    params.push(...filter.compiled.params);
  }

  const sql =
    `SELECT items.*, ${FIRST_PHOTO_URI_SQL} AS thumb_uri ` +
    `FROM items WHERE ${clauses.join(' AND ')} ` +
    `ORDER BY ${orderByFor(sort)}`;
  return { sql, params };
}

// Distinct tags across one collection's items, alphabetical — feeds the
// filter bar's tag chips. One param: collection id. The subquery drops
// NULL/malformed tags BEFORE json_each ever sees them; rows created before
// tagging shipped carry NULL.
export const DISTINCT_TAGS_SQL =
  `SELECT DISTINCT json_each.value AS tag ` +
  `FROM (SELECT tags FROM items WHERE collection_id = ? ` +
  `AND tags IS NOT NULL AND json_valid(tags)) AS tagged, ` +
  `json_each(tagged.tags) ` +
  `ORDER BY tag`;

//*************************************************************************
// Dashboard rollups
//*************************************************************************

// Portfolio hero numbers — one row, whole archive. COALESCE keeps the sum
// at 0 (not NULL) when no item carries a value yet.
export const DASHBOARD_TOTALS_SQL =
  `SELECT COUNT(*) AS item_count, ` +
  `COALESCE(SUM(current_value_cents), 0) AS total_value_cents ` +
  `FROM items`;

// Per-vertical rollup for the dashboard grid, richest shelf first. LEFT
// JOIN so a fresh collection with zero items still gets a card; COUNT(i.id)
// (not COUNT(*)) keeps that empty vertical honest at 0.
export const VERTICAL_BREAKDOWN_SQL =
  `SELECT c.vertical, COUNT(i.id) AS item_count, ` +
  `COALESCE(SUM(i.current_value_cents), 0) AS value_cents ` +
  `FROM collections c ` +
  `LEFT JOIN items i ON i.collection_id = c.id ` +
  `GROUP BY c.vertical ` +
  `ORDER BY value_cents DESC`;

// Newest catalogued items across every collection, each with its
// first-photo thumb riding along. One param: the row limit.
export const RECENT_ITEMS_SQL =
  `SELECT items.*, ${FIRST_PHOTO_URI_SQL} AS thumb_uri ` +
  `FROM items ORDER BY created_at DESC LIMIT ?`;

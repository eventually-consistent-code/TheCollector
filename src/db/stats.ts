/**
 * Purpose: Vault-wide aggregate SQL — one cheap query for the "N collections
 * · M items" lines on Profile and the Insights stat tiles. Kept out of
 * hooks.ts on purpose; screens bind it with useQuery directly.
 * Author(s): John Reed
 */

// Totals across the whole vault in a single round trip — two scalar
// subqueries, no joins, so PowerSync watches both tables and re-runs on
// any change to either.
export const TOTALS_SQL = `SELECT
  (SELECT COUNT(*) FROM collections) AS collections,
  (SELECT COUNT(*) FROM items) AS items`;

export interface TotalsRow {
  collections: number;
  items: number;
}

/**
 * Purpose: Money helpers — the db stores integer cents, humans type dollars.
 * Author(s): John Reed
 */

// "12.34" | "$12.34" | "12" → 1234; garbage → null.
export function displayToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '');
  if (cleaned === '') {
    return null;
  }
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.round(value * 100);
}

// 1234 → "$12.34".
export function centsToDisplay(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

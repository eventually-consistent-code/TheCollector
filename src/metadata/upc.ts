/**
 * Purpose: Barcode normalization — iOS reports UPC-A scans as EAN-13 with a
 * leading zero (AVFoundation), so the same physical barcode arrives
 * differently per platform. Everything downstream (bridge, cache, Discogs)
 * gets one canonical form.
 * Author(s): John Reed
 */

// Barcode types we ask the scanner for (mirrors CameraView barcodeTypes).
export const SCAN_BARCODE_TYPES = ['upc_a', 'upc_e', 'ean13', 'ean8', 'qr'] as const;

export interface NormalizedBarcode {
  // Digits only, canonical: 12-digit UPC-A when derivable, else as scanned.
  value: string;
  // The scanner-reported type after normalization.
  type: string;
}

// Collapses the platform split: EAN-13 with a leading 0 IS a UPC-A.
// Non-numeric data (QR) passes through untouched.
export function normalizeBarcode(data: string, type: string): NormalizedBarcode {
  const digits = data.trim();

  if (!/^\d+$/.test(digits)) {
    return { value: digits, type };
  }

  if (type === 'ean13' && digits.length === 13 && digits.startsWith('0')) {
    return { value: digits.slice(1), type: 'upc_a' };
  }

  return { value: digits, type };
}

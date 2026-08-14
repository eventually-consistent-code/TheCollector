/**
 * Purpose: Can this platform scan barcodes with a camera? Native always can
 * (expo-camera → MLKit / AVFoundation); web only where the browser ships
 * BarcodeDetector (Chromium). Everyone else types the number.
 * Author(s): John Reed
 */

export function canCameraScan(platform: string, globalObject: object | undefined): boolean {
  if (platform !== 'web') return true;
  return !!globalObject && 'BarcodeDetector' in globalObject;
}

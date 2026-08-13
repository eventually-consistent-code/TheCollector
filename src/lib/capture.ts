/**
 * Purpose: Photo capture + processing — picker/camera in, resized JPEG
 * ArrayBuffers out. One resize at capture (max 2048px, q0.8) instead of a
 * thumbnail pipeline; also bakes EXIF orientation and strips metadata.
 * Author(s): John Reed
 */

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

// Constants

const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 0.8;

// Resizes one picked asset to a bounded JPEG and returns its bytes.
async function processAsset(asset: ImagePicker.ImagePickerAsset): Promise<ArrayBuffer> {
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width ?? 0, asset.height ?? 0) > MAX_DIMENSION) {
    if ((asset.width ?? 0) >= (asset.height ?? 0)) {
      context.resize({ width: MAX_DIMENSION });
    } else {
      context.resize({ height: MAX_DIMENSION });
    }
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: JPEG_QUALITY,
  });
  const response = await fetch(saved.uri);
  return response.arrayBuffer();
}

// Multi-select from the library. Returns [] on cancel.
export async function pickPhotos(): Promise<ArrayBuffer[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 1,
  });
  if (result.canceled) {
    return [];
  }
  return Promise.all(result.assets.map(processAsset));
}

// Single camera capture. Returns null on cancel/denied.
export async function takePhoto(): Promise<ArrayBuffer | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({ quality: 1 });
  if (result.canceled || !result.assets.length) {
    return null;
  }
  return processAsset(result.assets[0]);
}

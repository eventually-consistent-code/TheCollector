/**
 * Purpose: Native local attachment storage — Expo FileSystem (new SDK 54+
 * File/Directory API) via the PowerSync RN storage package.
 * Author(s): John Reed
 */

import { ExpoFileSystemStorageAdapter } from '@powersync/attachments-storage-react-native';
import type { LocalStorageAdapter } from '@powersync/common';

export function createLocalPhotoStorage(): LocalStorageAdapter {
  return new ExpoFileSystemStorageAdapter();
}

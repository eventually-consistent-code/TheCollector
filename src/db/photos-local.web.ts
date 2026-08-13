/**
 * Purpose: Web local attachment storage — IndexedDB-backed files
 * (indexeddb:// URIs) from the PowerSync web SDK.
 * Author(s): John Reed
 */

import type { LocalStorageAdapter } from '@powersync/common';
import { IndexDBFileSystemStorageAdapter } from '@powersync/web';

export function createLocalPhotoStorage(): LocalStorageAdapter {
  return new IndexDBFileSystemStorageAdapter();
}

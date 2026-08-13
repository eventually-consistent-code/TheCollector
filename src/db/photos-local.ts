/**
 * Purpose: Type-level default for `./photos-local` imports — Metro resolves
 * the platform file; this gives tsc the shared shape. Never bundled.
 * Author(s): John Reed
 */

import type { LocalStorageAdapter } from '@powersync/common';

export declare function createLocalPhotoStorage(): LocalStorageAdapter;

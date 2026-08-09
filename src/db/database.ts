/**
 * Purpose: Type-level default for `./database` imports. Metro always resolves
 * the platform file (database.native.ts / database.web.ts); this declaration
 * gives tsc and tooling the shared shape. Never bundled.
 * Author(s): John Reed
 */

import type { AbstractPowerSyncDatabase } from '@powersync/common';

export declare const db: AbstractPowerSyncDatabase;

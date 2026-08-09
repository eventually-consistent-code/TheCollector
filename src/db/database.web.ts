/**
 * Purpose: PowerSync database for web — wa-sqlite in a worker, persisted to
 * OPFS/IndexedDB. Worker assets are served from public/@powersync (copied by
 * `npx powersync-web copy-assets -o public`).
 * Author(s): John Reed
 */

import { PowerSyncDatabase } from '@powersync/web';

import { AppSchema } from './schema';

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'thecollector.db',
  },
});

/**
 * Purpose: PowerSync database for web — wa-sqlite in a worker, persisted to
 * OPFS/IndexedDB. Worker assets are served from public/@powersync (copied by
 * `npx powersync-web copy-assets -o public`).
 * Author(s): John Reed
 */

import { PowerSyncDatabase } from '@powersync/web';

import { AppSchema } from './schema';

// Metro can't bundle workers, so point at the copied assets explicitly.
export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'thecollector.db',
    worker: '/@powersync/worker.js',
  },
  sync: {
    worker: '/@powersync/worker.js',
  },
});

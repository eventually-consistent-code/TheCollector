/**
 * Purpose: PowerSync database for iOS/Android — real SQLite via op-sqlite
 * (built into @powersync/react-native 2.x). Sync stays unconfigured in
 * phase 1; the Supabase connector lands in phase 2.
 * Author(s): John Reed
 */

import { PowerSyncDatabase } from '@powersync/react-native';

import { createQuietLogger } from './logger';
import { AppSchema } from './schema';

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'thecollector.db',
  },
  logger: createQuietLogger('PowerSync'),
});

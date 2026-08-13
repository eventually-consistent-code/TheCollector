/**
 * Purpose: PowerSync logger that downgrades known-benign disconnect noise.
 * The service periodically closes the sync stream (token expiry, keepalive
 * rebalance); the SDK reconnects fine but logs the close at error level,
 * which the dev overlay treats as a red console error. Route those to warn.
 * Author(s): John Reed
 */

import {
  LogLevels,
  createConsoleLogger,
  type PowerSyncLogger,
} from '@powersync/common';

// Constants

// Expected, self-healing stream closes — not actionable.
const BENIGN_PATTERNS = [/RSocket error.*Closed/i, /Stream end encountered/i];

export function createQuietLogger(prefix: string): PowerSyncLogger {
  const base = createConsoleLogger({ prefix });
  return {
    log(entry) {
      const message = String(entry.message ?? '');
      if (
        entry.level >= LogLevels.error &&
        BENIGN_PATTERNS.some((re) => re.test(message))
      ) {
        base.log({ ...entry, level: LogLevels.warn });
        return;
      }
      base.log(entry);
    },
  };
}

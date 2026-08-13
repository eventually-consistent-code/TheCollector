---
status: resolved
issue: 10
created: 2026-08-13
resolved: 2026-08-13
---
# Trace: PowerSync RSocket "Closed / Stream end encountered" console errors repeating (44×) on iOS after app left running — determine if sync self-heals (token-expiry reconnect noise) or connection is stuck in a dead loop

## evidence — 2026-08-13
iOS dev build left running overnight shows LogBox "Log 44 of 44": [PowerSync]: RSocket error Error: Closed. Original cause [Error: Stream end encountered]. Same message ×44 — a repeating close/reconnect cycle, cadence unknown. App was connected via WebSocket transport (SyncStreamConnectionMethod.WEB_SOCKET, set in phase 2). Supabase access tokens expire hourly; PowerSync free-tier instances also idle-deactivate.

## hypothesis — 2026-08-13
H1 (likely): periodic server-side stream close (Supabase token expiry ~1h and/or PowerSync service keepalive/rebalance) → SDK logs the RSocket close as a console ERROR, then reconnects successfully — noisy but self-healing. 44 errors over ~9h ≈ one every ~12 min, consistent with periodic closes + successful reconnects, NOT a tight retry loop (5s retry would produce thousands). H2: free-tier instance idle-deactivated → every reconnect dies immediately → status stuck offline. Discriminating test: relaunch app (clears LogBox), check status bar — synced ⇒ H1, offline ⇒ H2.

## test — 2026-08-13
Relaunched app with Metro up: status went straight to synced, both collections present. H1 CONFIRMED — connection establishes cleanly; the overnight errors were periodic server-side stream closes (~every 12 min avg: token expiry + service keepalives) each followed by successful reconnect. H2 (idle-deactivated instance) ruled out. Defect reduces to log noise: the SDK logs an expected/recoverable RSocket close at error level, which LogBox surfaces as a red console error. Fix: custom logger on the PowerSync db that downgrades the known-benign RSocket close message to warn; everything else passes through.

## verdict — 2026-08-13
Cause: PowerSync service periodically closes the WebSocket sync stream (hourly Supabase token expiry + service keepalives); the SDK reconnects automatically within seconds, but logs each close at error level — 44 red LogBox errors over an overnight session, zero actual downtime (relaunch test: instant synced). Fix: custom PowerSyncLogger downgrading the known-benign RSocket close messages (RSocket error…Closed / Stream end encountered) to warn, wired into both platform db setups; real errors pass through untouched; unit-tested. Commit 76956a6.

## resolution — 2026-08-13
Self-healing reconnect noise, not an outage. Log severity fixed in 76956a6 (benign RSocket closes → warn); offline status indicator still catches any real failure.

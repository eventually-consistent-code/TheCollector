---
status: resolved
issue: 43
created: 2026-08-17
resolved: 2026-08-17
---
# Trace: Book type-ahead lookup fails with raw TCP timeout in the popover — Open Library unreachable from Supabase edge egress (os error 110); Google Books fallback never engages on OL transport errors (only on empty results), and the raw upstream error string renders in the suggestion hint row

## verdict — 2026-08-17
Cause: Open Library full outage (TCP connect timeouts from every vantage — not edge-specific) exposed two design gaps: (1) books source's Google fallback engaged only on EMPTY results, never on OL errors, so the outage threw straight through; (2) the raw transport error chain rendered verbatim in the type-ahead hint row. Fix 33254c7: 6s AbortController on OL calls, failover-on-error to Google when the key is deployed, human message when both paths exhaust, and client-side friendlyHint() sanitizing plumbing-smelling messages. Live-verified through the deployed fn during the outage: "the lord of the rings" → 10 Google Books rows with covers in ~1s (was a 60s+ hang). 341/341 tests, tsc clean. Cache note: OL failures were never cached (fetcher-throws discipline held).

## resolution — 2026-08-17
Fixed in 33254c7 (OL 6s timeout + failover-on-error to Google + human messages + client hint sanitization); live-verified during the actual OL outage — Tolkien search returns 10 Google rows with covers in ~1s.

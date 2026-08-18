# ARCA-56 — `seed-analytics.ts` crashes in its own summary step; a partial run leaves Analytics silently broken

**Status:** Todo · **Area:** Analytics/Setup · **Depends on:** —

## Why this matters (for the founder)
This is one of the six documented setup commands (`CLAUDE.md` Quick Start). It takes several
minutes with almost no progress feedback, then throws an unhandled exception in its own
summary-printing code at the very end — so even a fully successful run *looks* like it crashed. Worse,
if the process is interrupted before it finishes (very plausible given the runtime — my first attempt
used a 90-second timeout, a normal default, and it was nowhere near done), the app is left running
against a database with almost no real analytics coverage, and nothing in the UI says why.

## Context
Found during the ARCA-43 UI/UX audit, following the documented setup path.

**Part A — the crash.** Ran `bun run scripts/seed-analytics.ts` against the existing dev database.
The four documented pipeline steps all completed successfully:
```
[1/4] Backfilling OHLC for last 30 days...       Generated 21660 OHLC bars.
[2/4] Generating today's OHLC from current prices...   Generated 636 bars for yesterday.
[3/4] Running full analytics pipeline...
  [analytics] Indicators computed for 808 cards
  [analytics] Card analytics computed for 808 cards
  [analytics] ARCA scores computed for 808 cards
  [analytics] Grading alpha computed for 195 cards
  [analytics] Market index updated for 2026-08-17
  Pipeline complete.
[4/4] Backfilling market index...                Generated 45 market index days.
=== Analytics seed complete! ===
```
Immediately after printing "Analytics seed complete!", the script crashes while computing its own
summary counts:
```
TypeError: query.getSQL is not a function. (In 'query.getSQL()', 'query.getSQL' is undefined)
    at all (node_modules/drizzle-orm/sqlite-core/db.js:259:71)
    at scripts/seed-analytics.ts:47:22
```
`scripts/seed-analytics.ts:46-47` calls `db.all({ sql: "SELECT COUNT(*) ...", args: [] } as any)` —
Drizzle's `db.all()` expects a query builder object (something with `.getSQL()`), not a raw
`{sql, args}` shape, so this always throws regardless of how well the seed itself went. The script
exits with an uncaught exception/non-zero status even on full success, which reads as failure.

**Part B — what an interrupted run leaves behind.** Before running the full script, the existing dev
database (seeded on a previous occasion, per its file timestamp) had `card_analytics` populated for
only **1 of 502** cards, and the Analytics page's ARCA Market Index showed `Index Value: 0.02`,
`Market Cap: US$9.45`, `Cards Tracked: 1` — numbers that are technically real but meaningless for a
market-wide index, with no caveat that coverage was almost nonexistent. After letting this same
script run to completion (~6+ minutes), `card_analytics` covers 808 rows and the index shows
`Index Value: 38.61`, `Market Cap: US$19,057.65`, `Cards Tracked: 593` — a plausible market-wide
figure. This strongly suggests the earlier state was the result of a prior run that didn't finish
(matching the exact failure mode a normal command timeout would produce, since this run took well
over the common 90–120s default), and nothing in the app or the seed tooling flags that the analytics
data is incomplete.

**Expected:** the seed script exits 0 on success and prints its summary; if interrupted or partially
run, the app surfaces that analytics coverage is incomplete rather than presenting a tiny, meaningless
subset as if it were the whole market.
**Actual:** the script always ends in an uncaught exception even when everything upstream succeeded,
and a partial/interrupted run leaves the Analytics page showing numbers that look like real
market-wide data but reflect a handful of cards.

**Reproduce:** `bun run scripts/seed-analytics.ts` from repo root; observe the stack trace after
"Analytics seed complete!". To see Part B, interrupt the script mid-run (e.g. Ctrl-C during step 3)
and load `/analytics` in the app afterward.

## Scope
- Fix `scripts/seed-analytics.ts`'s summary block to use Drizzle's query builder (or `sqlite`'s raw
  driver directly) instead of passing a `{sql, args}` object to `db.all()`, so the script exits
  cleanly on success.
- Consider a coverage floor/warning: if `card_analytics` (or `market_index_daily.card_count`) covers
  a small fraction of the seeded card catalog, log a clear warning rather than silently succeeding —
  same spirit as ARCA-44's "fail loudly" fix for the card seed script.
- Consider surfacing partial coverage in the Analytics UI itself (e.g. "tracking 593 of 502... note:
  verify against total catalog size" or similar honest caveat), related to the per-card honesty work
  already scoped in ARCA-48.

## Out of scope
- Speeding up the pipeline itself (a 6+ minute run for ~600 cards may be reasonable) — this ticket is
  about the crash and the silent partial-state risk, not raw performance (see ARCA-38 for
  batching/perf).
- Any change to indicator/score formulas.

## Acceptance criteria
- [ ] `bun run scripts/seed-analytics.ts` exits with status 0 and prints its table-count summary on a
      successful run, with no uncaught exception.
- [ ] Either the script warns loudly when coverage is far below the seeded catalog size, or the
      Analytics UI itself indicates when its market-wide figures are based on partial coverage.

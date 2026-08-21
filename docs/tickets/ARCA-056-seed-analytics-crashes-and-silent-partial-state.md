# ARCA-56 — `seed-analytics.ts` crashes in its own summary step; a partial run leaves Analytics silently broken

**Status:** Shipped ·  **Area:** Analytics/Setup · **Depends on:** —

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

> **Part A (the crash) was fixed in passing by ARCA-65, 2026-08-21.** Removing the four `as any`
> casts from the summary block required calling the API correctly, and the correct call is exactly
> what this ticket asked for. Demonstrated both ways: `db.all(sql`…`)` returns `[{"cnt":0}]`, while
> the old `{sql, args}` form throws `query.getSQL is not a function`.
>
> **Part B shipped 2026-08-21.** Both halves the scope offered, because they reach different people:
> the script warning helps whoever ran it, and the page caveat helps everyone who looks afterwards —
> which is the founder, and the reason this ticket exists.

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
- [x] `bun run scripts/seed-analytics.ts` exits 0 and prints its summary on a successful run, with no
      uncaught exception (Part A, ARCA-65). Verified end to end: the script now runs to completion
      and prints readable counts rather than `[{"cnt":0}]`.
- [x] **Both**, not either. The script warns and **exits 1** when coverage is below 80% of the
      catalog; the Analytics page carries a caveat naming both numbers, and "Cards Tracked" now
      shows `N of M` rather than a bare N.

## How it works, and why the numbers live server-side

`GET /analytics/market-index` returns a `coverage` block — cards covered, catalog total, and the
fraction. Computed in the handler rather than the client so there is **one** answer: a page that
derives its own coverage can disagree with the API about what is covered, and then neither can be
trusted.

`fraction` is `null` when the catalog is empty. "No cards at all" and "0% of the cards we have" are
different situations, and a page that cannot tell them apart will state the wrong one.

The floor is **80%**, not something stricter. Real coverage is never total — a card with too little
price history has nothing to compute, so a healthy run still falls short of 100%. The case worth
catching (the audit found **1 of 502**) is an order of magnitude from the edge, and a threshold that
fires on a healthy run is one people learn to ignore.

## Verified in both directions

A banner that is always visible is decoration. `scripts/analytics-coverage.pw.ts` asserts it appears
when coverage is partial **and is absent when it is not**, and both branches were exercised: shown at
0 of 12, then absent after a full-coverage index row was inserted.

The script's exit code was checked directly rather than through a pipe — `$?` after `| tail` is
tail's status, which is how a non-zero exit gets missed.

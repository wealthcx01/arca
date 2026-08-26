# PRP — ARCA-063-refresh-market-wide-prices

## Intent
Every card in ARCA's catalog gets a fresh price on every refresh cycle, not just the ones someone happens to hold — so screeners, trend views, and leaderboards are honest about the whole market, not a held-only slice of it.

## Context
- `modules/pricing/jobs.ts:39-60` — `getHeldCardRefs()` builds the refresh work list by inner-joining `holdings` to `cards`, so a card with zero holdings never enters `syncPrices()`.
- `modules/pricing/jobs.ts:271-374` — `syncPrices()` is the orchestrator: gets card refs (line 274), runs free providers (`getFreeProviders()`, lines 286-300), runs BYOK providers (`getByokProviders()`, lines 304-351), persists via `persistPrices`/`persistGradedPrices`, then runs conflation (`runConflation`) to set `conflated_rank = 1` per card+variant. Scheduled every 6h at line 465.
- `modules/pricing/providers/registry.ts` — `getFreeProviders()` returns tcgdex, tcgcsv, pokemon-tcg (no key required); `getByokProviders()` returns pokemon-price-tracker, poketrace, pricecharting (require a per-user encrypted key from `userApiKeys`).
- `modules/pricing/schema.ts:53-69` — `userApiKeys.daily_usage` is incremented by `cardRefs.length` after each BYOK fetch (`jobs.ts:335-342`) but there is no stored limit and no enforcement check anywhere — usage is only ever recorded, never compared against a cap.
- `modules/pricing/providers/tcgdex.ts:94-95` and `pokemon-tcg.ts:51` — free providers already batch requests (batch size 5) with delays between batches; this is the existing throttling mechanism, not a daily cap.
- `modules/cards/schema.ts` — `cards` table has no "tradable"/"active" flag; every row in `cards` is the tradable catalog. There is no existing `getAllCardRefs`-style helper — it doesn't need one built for this ticket, a plain select does the job.
- `modules/market/handlers.ts` — screener/overview/movers/ticker endpoints already query `card_prices` (filtered to `conflated_rank = 1`) joined from `cards`, with no held-only filtering. They will surface any card that has a row in `card_prices`, so no changes are needed here — confirmed via [[ARCA-49]] plan that this pipeline already assumes market-wide coverage.
- ARCA-49 (`docs/tickets/ARCA-049-bulk-daily-price-feed-plan.md`, shipped) already validated that free providers (tcgdex/tcgcsv/pokemon-tcg) can cover the full catalog size (~1,250 cards) daily within their documented free limits (TCGCSV ~10k req/day, Pokemon TCG API 20k/day with key, TCGdex uncached-but-tolerant). This ticket only needs to act on that finding for card selection — it does not need to design new provider capacity.
- ARCA-24 (catalog cap ~1,250 of ~19,000) is explicitly out of scope — this ticket pulls from the catalog as it exists today, whatever its size.
- Test pattern: `modules/pricing/handlers.test.ts` uses Hono's test client against the mounted router; no existing unit tests exercise `syncPrices()`/`getHeldCardRefs()` directly — those are currently untested integration logic.

## Approach
Smallest correct change: replace the card-selection step in `syncPrices()` so it prices every card in the catalog, and keep BYOK usage tracking honest at the new, larger scale.

- `modules/pricing/jobs.ts`: replace `getHeldCardRefs()` with a `getAllCardRefs()` (or similarly named) function that selects `id, external_id, name, set_code, set_name` from `cards` directly (no join to `holdings`), dedup no longer needed since `cards.id` is already unique. Update the single call site at line 274 and the "no holdings found" guard/log message, which no longer makes sense once selection isn't holdings-derived (guard on empty catalog instead).
- Free providers: pass the full catalog list straight through, unchanged otherwise — ARCA-49 already confirmed this is safe within existing free-tier limits.
- BYOK providers: no schema change needed since no limit is enforced today for held-only runs either. The `daily_usage` increment (`jobs.ts:335-342`) will now correctly reflect the larger `cardRefs.length` per run — leave this mechanism as the source of truth, but add a defensive guard skipping (with a status/error log via `updateProviderStatus`) BYOK providers so a single very large catalog run doesn't silently double-count or crash if a provider call fails partway (this behavior already exists via the per-provider try/catch, just verify it still holds at the larger scale — no new code needed if so).
- No changes required in `modules/market/handlers.ts` — those endpoints already read broadly from `card_prices`.
- No changes required to `modules/cards/schema.ts` or catalog size.

## Tasks
- [ ] Replace `getHeldCardRefs()` in `modules/pricing/jobs.ts` with a catalog-wide `getAllCardRefs()` (or equivalent) that selects all rows from `cards`, no `holdings` join.
- [ ] Update `syncPrices()` (line 274 and the empty-list guard/log) to use the new selection function and reflect "empty catalog" rather than "no holdings" in logs/comments.
- [ ] Verify the free-provider loop (`getFreeProviders()`) runs unchanged against the full catalog list and existing batching/delay logic in `tcgdex.ts`/`pokemon-tcg.ts` still applies per-provider (no per-call code changes expected).
- [ ] Verify the BYOK-provider loop's `daily_usage` increment at `jobs.ts:335-342` still fires correctly with the larger `cardRefs.length`, and that a provider failure for one BYOK key doesn't block others (existing try/catch per provider).
- [ ] Manually run (or seed-test) a full `syncPrices()` cycle locally and confirm `card_prices` rows now exist for a card with zero holdings.
- [ ] Confirm a market-wide view (e.g. `/api/market/sets` or `/api/market/movers`) returns fresh data for that previously-unheld card after the run.
- [ ] Add/extend a test in `modules/pricing/jobs.test.ts` (new file, following the Hono test-client pattern in `handlers.test.ts`) exercising card selection and/or `syncPrices()` end to end against a seeded catalog with holdings-free cards.

## Validation gates
- [ ] happy path: after `syncPrices()` runs, `card_prices` contains a fresh (`fetched_at` within the run) row with `conflated_rank = 1` for a card that has zero rows in `holdings`.
- [ ] happy path: `modules/market/handlers.ts` screener/movers/ticker endpoints return that previously-unheld card with a non-null price after the run, with no held-only filter reintroduced anywhere in the query chain.
- [ ] edge cases: a catalog with zero cards (empty `cards` table) causes `syncPrices()` to log and return early without erroring, mirroring the old empty-holdings guard.
- [ ] edge cases: a card that is held AND in the catalog is priced exactly once per provider (no duplicate `card_prices` rows from double-counting held + catalog selection).
- [ ] errors: a single free-provider or BYOK-provider fetch failure (simulated via thrown error) is caught, recorded via `updateProviderStatus(..., "error", ...)`, and does not stop the remaining providers or the conflation pass from running.
- [ ] errors: `userApiKeys.daily_usage` increments by the actual `cardRefs.length` used in the run (catalog-wide count, not the old held-only count) so usage reporting in `modules/pricing/handlers.ts` stays accurate.
- [ ] coverage: `modules/pricing/jobs.test.ts` (or equivalent) covers card selection returning catalog-wide refs regardless of `holdings` contents, and asserts the previous held-only behavior is gone.
- [ ] coverage: existing `modules/pricing/handlers.test.ts` suite still passes unchanged (route ordering / API key handler behavior untouched by this change).

<!-- foundry-ticket: 00639e871618ea93 -->

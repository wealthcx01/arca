# PRP — ARCA-057-pricing-sources-always-zero-synced

## Intent
A user opening Settings sees an accurate "N cards synced" count for TCGdex and TCGCSV, so the
panel actually reassures instead of reading as "this integration is broken" whenever a database was
populated by the seed script.

## Context
- `pricingRouter.get("/sources", ...)` in `modules/pricing/handlers.ts:45-63` reads
  `cards_synced` from `price_source_status`, defaulting to `0` via `status?.cards_synced ?? 0` when
  no row exists for a provider. This logic is correct and out of scope to change.
- `modules/pricing/jobs.ts` already writes `price_source_status` correctly: `updateProviderStatus`
  (currently module-private, `jobs.ts:63-101`) upserts `status`, `cards_synced`, `last_error`,
  `last_sync_at` for a provider, and is called from `syncPrices()` (`jobs.ts:271-...`, calls at
  lines 288/293/298 for free providers and 317/344/349 for BYOK providers) after each provider
  fetch, passing `prices.length` as `cardsSynced`.
- `scripts/seed-prices.ts` is the documented dev bootstrap path (README / CLAUDE.md quick start:
  `bun run scripts/seed-prices.ts`). It fetches real TCGdex prices (`fetchAllPrices`,
  source `"tcgdex"`), persists them straight into `card_prices` and `price_history`
  (`persistAndGenerateHistory`), runs conflation, and generates graded prices — but never touches
  `price_source_status`. That's the entire gap: a freshly seeded environment has real `tcgdex`-sourced
  rows in `card_prices` (851 in the reported case) but zero rows in `price_source_status`, so every
  provider — including ones that were never touched by seeding, like TCGCSV — reads as
  "0 cards synced."
- Providers are registered in `modules/pricing/providers/index.ts`; `tcgdexProvider.name === "tcgdex"`
  (`providers/tcgdex.ts:88`) and `tcgcsvProvider.name === "tcgcsv"` (`providers/tcgcsv.ts:132`).
  `seed-prices.ts` only ever writes `source: "tcgdex"` rows — it has no TCGCSV fetch path, so
  TCGCSV will correctly still read 0 in a seed-only environment until the real `syncPrices()` job
  runs for it. That's expected, not a bug this ticket needs to close (see ticket's second scope
  bullet: verify the real job path, don't fabricate TCGCSV activity in the seed script).
- `price_source_status` schema: `modules/pricing/schema.ts:95-107` — `provider` (unique), `status`,
  `last_sync_at`, `last_error`, `cards_synced`, `updated_at`.
- Frontend display: `client/src/pages/SettingsPage.tsx:15` (type) and `:111` (renders
  `{source.cards_synced} cards synced`) — no frontend change needed, it already renders whatever the
  API returns.
- No existing test file covers `scripts/seed-prices.ts` or the provider-status upsert path
  (searched for `*pricing*test*`, `*seed-prices*test*` — none found).

## Approach
Smallest correct change: make `scripts/seed-prices.ts` call the same status-upsert logic the real
sync job uses, right after it persists TCGdex prices, instead of inventing parallel logic.

- `modules/pricing/jobs.ts`: export `updateProviderStatus` (drop the implicit module-private
  visibility) so it can be reused instead of duplicated.
- `scripts/seed-prices.ts`: import `updateProviderStatus` from `../modules/pricing/jobs.ts`; after
  `persistAndGenerateHistory(prices)` succeeds, call it for `"tcgdex"` with `status: "ok"`,
  `cardsSynced: prices.length` (matching the semantics `syncPrices()` already uses — count of price
  records fetched, not deduped card count), `error: null`. If `fetchAllPrices` returns zero results
  the script already `process.exit(1)`s before persisting, so no separate zero/error-state write is
  needed there.
- No change to `modules/pricing/handlers.ts` (its fallback logic is already correct) or to
  `SettingsPage.tsx` (already renders the field correctly).
- Verify, without code changes, that `syncPrices()` continues to update `cards_synced` correctly for
  both `tcgdex` and `tcgcsv` on a real run (read-through of `jobs.ts:271-352`, already confirmed
  above) — this satisfies the ticket's second scope bullet.

## Tasks
- [ ] Export `updateProviderStatus` from `modules/pricing/jobs.ts`.
- [ ] Import it in `scripts/seed-prices.ts` and call it for the `"tcgdex"` provider after prices are
      persisted, with `cardsSynced` set from the fetched-results count.
- [ ] Re-run `bun run scripts/seed-prices.ts` (or an equivalent targeted script/test) against a dev
      database and confirm a `price_source_status` row now exists for `tcgdex` with a non-zero
      `cards_synced`.
- [ ] Confirm `GET /api/pricing/sources` now returns a non-zero `cards_synced` for `tcgdex` and that
      `tcgcsv` still correctly reads whatever `price_source_status` holds for it (0 if no sync has run,
      matching real coverage).
- [ ] Add/confirm a test covering the seed script's (or shared helper's) status upsert so this
      doesn't regress silently.

## Validation gates
- [ ] happy path: after running `scripts/seed-prices.ts` against a database with cards but no prior
      `price_source_status` rows, a `tcgdex` row exists in `price_source_status` with
      `status = "ok"` and `cards_synced` equal to the number of price records fetched that run, and
      `GET /api/pricing/sources` reflects that same non-zero count for TCGdex.
- [ ] edge cases: running the seed script a second time (upsert, not duplicate-insert) updates the
      existing `tcgdex` row's `cards_synced`/`last_sync_at` rather than creating a second row
      (`provider` is `unique()` in the schema, so this must not throw a constraint error); a provider
      never touched by seeding (e.g. `tcgcsv`) still correctly falls back to `0` via the existing
      `status?.cards_synced ?? 0` handler logic, not a fabricated number.
- [ ] errors: if `fetchAllPrices` returns zero results, the script exits before persisting (existing
      behavior, `process.exit(1)`) and does not write a misleading "ok, 0 synced" status row for
      `tcgdex`.
- [ ] coverage: a test exercises the provider-status upsert path exposed/reused by the seed script
      (insert-when-absent and update-when-present against `price_source_status`), so this gap can't
      silently reappear if the seed script's persistence logic changes again.

<!-- foundry-ticket: 87e10661bea3f649 -->

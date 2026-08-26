# PRP — ARCA-064-card-price-last-updated

## Intent
On the card detail page, every price a trader sees carries a visible "updated X ago" label (or a clear "no recent update" flag when the data is missing or stale), so they can judge trust before acting on it.

## Context
- `card_prices.fetched_at` (`modules/pricing/schema.ts:17-19`) and `graded_prices.fetched_at` (`modules/pricing/schema.ts:86-88`) already store a real, per-row `timestamp_ms` refresh time — set on every insert/upsert in `persistPrices()`/`persistGradedPrices()` (`modules/pricing/jobs.ts:104-164`, `:167-210`). No new capture plumbing needed, confirming the ticket's framing.
- `price_history.recorded_at` (`modules/pricing/schema.ts:32-34`) is a historical snapshot column, not a "current price" freshness signal — out of scope for this display change.
- Three pricing endpoints feed the card page and currently drop the timestamp before it reaches the client:
  - `GET /pricing/:cardId/conflated` (`modules/pricing/handlers.ts:244-286`) selects best-per-field prices via `conflate()` (`modules/pricing/conflation.ts:47-120`), but `PriceResult` (`modules/pricing/providers/types.ts:16-25`) and `ConflatedPrice` (`modules/pricing/providers/types.ts:64-76`) have no timestamp field at all, and the dedup step at `handlers.ts:259-266` already picks "latest per source+variant" — the row's `fetched_at` is available right there but discarded when building `priceResults` (`handlers.ts:268-277`).
  - `GET /pricing/:cardId` (`modules/pricing/handlers.ts:209-238`) returns raw `cardPrices` rows grouped by source/variant, which already includes `fetched_at` in the row — this endpoint needs no backend change, only frontend consumption.
  - `GET /pricing/:cardId/graded` (`modules/pricing/handlers.ts:292-316`) likewise returns raw `gradedPrices` rows including `fetched_at` — no backend change needed there either.
- `client/src/pages/CardDetailPage.tsx` renders three price tables that need the label: "Best Price (Conflated)" (`:232-278`, using `ConflatedPrice` interface `:32-44`), "All Sources" (`:342-373`, using `PriceData` interface `:46-54`), and "Graded Prices" (`:392-425`, using `GradedPrice` interface `:56-63`). None of the three local TS interfaces currently declare a timestamp field, and none of the three tables render one.
- No time-ago utility exists yet in the frontend (`client/src/lib/utils.ts` only has `cn()`); no `date-fns` or similar is installed (`client/package.json`). The nearest precedent for date formatting is `PriceChartPanel.tsx:48-51`, which uses native `Date` + `toLocaleDateString`.
- No staleness threshold constant exists anywhere in the codebase yet — this ticket is what defines "no recent update" for the first time.
- Refresh cadence is uneven and only covers held cards on a schedule (multi-provider sync runs every 6h/12h per `modules/pricing/jobs.ts:463-468`, but selects work via `getHeldCardRefs` per ARCA-63/ARCA-24 context) — this is explicitly why the ticket wants freshness surfaced now rather than waiting on full-catalog coverage, and is explicitly out of scope to fix here.
- `SourceBadge` (`client/src/components/pricing/SourceBadge.tsx`) is the existing pattern for a small reusable inline label rendered next to a price — the freshness label should follow the same "small component, used inline per price cell" shape for consistency.
- E2e coverage lives in `scripts/e2e-playwright.pw.ts`, which already has a `/cards/:id` regression precedent (`ARCA-53`-style pattern at `:70-93`, asserting visible content on the card detail page after a known bug class). No existing unit tests cover the conflated/graded pricing endpoints' response shape (`modules/pricing/handlers.test.ts` has no `conflated` references currently) or any client component for this page.

## Approach
Smallest correct change: thread the existing `fetched_at` timestamps through to the client for all three price sources, add one small reusable "freshness label" component with a staleness threshold, and use it in the three existing tables. No new DB columns, no new capture logic, no changes to refresh cadence/providers/conflation logic.

Files to touch:
- `modules/pricing/providers/types.ts` — add `fetched_at` (ms epoch number) to `PriceResult` and to `ConflatedPrice` (per-field: `market_fetched_at`, `low_fetched_at`, `mid_fetched_at`, `high_fetched_at`, mirroring the existing per-field `*_source` pattern).
- `modules/pricing/conflation.ts` — track and propagate `fetched_at` alongside `source` for each of the four best-picked fields (`bestMarket`, `bestLow`, `bestMid`, `bestHigh`).
- `modules/pricing/handlers.ts` — in the `/conflated` handler, include each row's `fetched_at` when building `priceResults` (`:268-277`) so it flows into `conflate()`.
- `modules/pricing/handlers.test.ts` — extend/add coverage asserting `fetched_at`/`*_fetched_at` fields are present in `/pricing/:cardId`, `/pricing/:cardId/conflated`, and `/pricing/:cardId/graded` responses.
- `client/src/lib/time.ts` (new, small) — a native-`Date`-based relative-time formatter (e.g. "2h ago", "3d ago") plus a staleness check, no new dependency.
- `client/src/components/pricing/PriceFreshness.tsx` (new, small) — renders the relative-time label or a "no recent update" flag given a nullable timestamp, following `SourceBadge`'s pattern for a compact inline component.
- `client/src/pages/CardDetailPage.tsx` — add the timestamp field(s) to the three local interfaces (`ConflatedPrice`, `PriceData`, `GradedPrice`), and render `PriceFreshness` next to each price in the three tables (`:232-278`, `:342-373`, `:392-425`).

## Tasks
- [ ] Add `fetched_at` to `PriceResult` in `modules/pricing/providers/types.ts`.
- [ ] Add per-field `*_fetched_at` to `ConflatedPrice` in `modules/pricing/providers/types.ts`.
- [ ] Update `conflate()` in `modules/pricing/conflation.ts` to select and carry `fetched_at` alongside each best-picked field's source.
- [ ] Update the `/pricing/:cardId/conflated` handler to pass each row's `fetched_at` into `priceResults`.
- [ ] Add/extend tests in `modules/pricing/handlers.test.ts` asserting timestamp fields are present in `/pricing/:cardId`, `/conflated`, and `/graded` responses.
- [ ] Add a relative-time + staleness helper at `client/src/lib/time.ts`.
- [ ] Add a `PriceFreshness` component at `client/src/components/pricing/PriceFreshness.tsx` that renders "updated X ago" or a "no recent update" flag based on the staleness threshold.
- [ ] Extend `ConflatedPrice`, `PriceData`, `GradedPrice` interfaces in `client/src/pages/CardDetailPage.tsx` with the new timestamp field(s).
- [ ] Render `PriceFreshness` next to each price in the "Best Price (Conflated)" table.
- [ ] Render `PriceFreshness` next to each price in the "All Sources" table.
- [ ] Render `PriceFreshness` next to each price in the "Graded Prices" table.
- [ ] Add an e2e assertion in `scripts/e2e-playwright.pw.ts` that the card detail page shows a freshness label.

## Validation gates
- [ ] happy path: a card with a recently-fetched price (e.g. `fetched_at` within the last hour) shows a correct, human-readable relative-time label (e.g. "updated 2h ago") next to every price in all three tables (conflated, all-sources, graded) on `client/src/pages/CardDetailPage.tsx`, sourced from the row's true `fetched_at`, not `Date.now()` at page load.
- [ ] edge cases: a price whose `fetched_at` is older than the defined staleness threshold renders the "no recent update" flag instead of a numeric/relative time; a price with `fetched_at === null` (or missing from the API response) also renders "no recent update" rather than crashing, showing "Invalid Date", or silently omitting the label.
- [ ] errors: `modules/pricing/handlers.ts` responses for `/pricing/:cardId`, `/conflated`, and `/graded` never break existing consumers — response shape is additive only (new fields, no renamed/removed fields), and `conflate()` in `modules/pricing/conflation.ts` still returns `null` source/timestamp pairs (not throwing) when no provider supplied a value for a given field.
- [ ] coverage: `modules/pricing/handlers.test.ts` asserts timestamp fields are present and correctly typed (ms epoch number) in the three endpoint responses; `bun run typecheck` (or project's TS check) passes with the updated interfaces in `CardDetailPage.tsx`; `scripts/e2e-playwright.pw.ts` asserts a freshness label is visible on a real card detail page load, following the existing `/cards/:id` regression pattern at `:70-93`.

<!-- foundry-ticket: c28d0b23485d6215 -->

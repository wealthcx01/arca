# PRP — ARCA-048-real-history-honest-gaps

## Intent
Every indicator, the ARCA Score, and volatility numbers should be computed from real accumulated
prices only — never a fabricated random walk — and any card that doesn't yet have enough real
history should say so plainly instead of showing a number.

## Context
- `scripts/seed-prices.ts` (lines 225-247) fabricates a 30-day random walk via a `jitter()`
  Box-Muller function and writes it into `price_history`. It is not wired into any npm script or
  scheduled job — it's a manual dev command per this repo's Quick Start — but nothing stops it
  from being run against a real deployment, and it's the origin of every synthetic row currently
  sitting in `price_history`.
- `modules/pricing/jobs.ts` already runs `syncPrices()` on a real schedule (registered
  `scheduler.register("pricing:sync-prices", syncPrices, 6 * 60 * 60 * 1000)`, wired up via
  `registerPricingJobs()` in `server.ts`). Its `persistPrices()` step (lines 152-162) inserts real
  snapshots into `price_history` with `recorded_at = now`. This job is the real data source ARCA-48
  depends on (ARCA-4/5) and needs no new code — just confirmation it's live and accumulating.
- `modules/pricing/schema.ts` (lines 22-35): `price_history` has no field distinguishing real vs.
  synthetic rows. Rows from `seed-prices.ts` are indistinguishable from real ones except by
  `recorded_at` (synthetic history is backdated) and possibly `source`.
- `modules/analytics/ohlc.ts` (`backfillOHLC`, `dailyOHLCJob`) reads straight from `price_history`
  with no notion of "is this real" — whatever's in the table becomes an OHLC bar.
- `modules/analytics/jobs.ts` (`computeIndicatorsForCard`, line 82) already guards on
  `bars.length < 5` and returns early. `modules/analytics/indicators.ts` guards each indicator
  individually (sma/ema/rsi/bollinger/atr/roc each check `bars.length < period` and return `[]`;
  macd checks internally). `modules/analytics/card-analytics.ts` guards
  parkinsonVolatility/sharpeRatio/maxDrawdown (`bars.length < 2`) and trendScore
  (`bars.length < 26`). `modules/analytics/arca-score.ts` guards `computeArcaScore`
  (`bars.length === 0` → `0`) and `valueScore` (`bars.length < 2` → `50`, a fake-neutral value).
  These guards exist but return `0`/`[]`/`50` — indistinguishable from a legitimately computed
  value — with no metadata saying "not enough data yet."
- `modules/analytics/schema.ts` `cardAnalytics` table (lines 47-60) has no column recording how
  many real days of history backed the row (no `history_days`/`data_points` field).
- `modules/analytics/handlers.ts` `GET /:cardId/summary` (line 101) returns the raw
  `cardAnalytics` row as `{ data: analytics }` with no accompanying threshold/status info.
- Frontend: `client/src/components/analytics/ArcaScoreBadge.tsx` (lines 37-45),
  `RiskMetrics.tsx` (lines 36-82), and `TechnicalSummary.tsx` (line 82) all render `—` (em dash)
  or omit the block entirely when a value is `null`/missing — there is no "building history (N of
  30 days)" pattern anywhere in this codebase to reuse; this ticket introduces it.
- Confirmed via ARCA-4 provider research (already in the ticket): no provider (free or paid —
  tcgdex, tcgcsv, pokemon-tcg.io, pokemon-price-tracker, poketrace, pricecharting) supplies
  backdated graded-card history. Backfilling the past is not possible; the only honest path is
  forward accumulation from today, which is explicitly out of scope to try to shortcut.

## Approach
Smallest correct change: stop synthetic data from ever reaching the analytics path, add a
real-history-day count to the analytics computation so downstream consumers can tell "computed
from N real days" from "computed from nothing," and thread that count through the API and the
three frontend components that render scores/indicators/vol so they show a "building history"
state below threshold instead of a value.

Files to touch:
- `scripts/seed-prices.ts` — remove the synthetic random-walk generation (`jitter()` and the
  backward-day loop, lines ~225-247); keep only real current-price fetching if still useful, or
  delete the script's synthetic-history responsibility entirely per ticket scope.
- `modules/pricing/schema.ts` / a migration — decide and add whatever's needed to identify real
  rows going forward (only needed if any synthetic rows could still exist in a live DB from prior
  runs; otherwise removing the generator is enough since no new synthetic rows will be written).
- `modules/analytics/schema.ts` — add a `history_days` (or `data_points`) integer column to
  `cardAnalytics` so the minimum-threshold check is persisted, not recomputed ad hoc by the UI.
- `modules/analytics/jobs.ts` (`computeIndicatorsForCard`) and `modules/analytics/card-analytics.ts`
  / `arca-score.ts` — compute and store the real bar count per card/currency alongside each
  metric; apply the per-metric minimum threshold already implicit in existing guards (5 for
  indicators, 26 for trend, etc.) consistently rather than silently defaulting to `0`/`50`.
- `modules/analytics/handlers.ts` (`/:cardId/summary`, `/:cardId/indicators`) — include
  `history_days` and a `sufficient: boolean` (or equivalent) per response so the frontend doesn't
  have to re-derive it.
- `client/src/components/analytics/ArcaScoreBadge.tsx`, `RiskMetrics.tsx`,
  `TechnicalSummary.tsx` — when `sufficient` is false, render "building history — N of {threshold}
  days collected" instead of the em dash / omitted block.

## Tasks
- [ ] Remove the synthetic random-walk generator from `scripts/seed-prices.ts` so no code path
      writes fabricated history into `price_history`.
- [ ] Confirm `pricing:sync-prices` is registered and running, and that each run appends a real
      row per priced card into `price_history` with an accurate `recorded_at`.
- [ ] Add a real-history-day count to the analytics computation (per card/currency) and persist it
      on `card_analytics` (or return it from the compute step).
- [ ] Apply a defined minimum-real-history threshold per metric family (matching or documenting
      the existing 5/26/30-day guards) so metrics below threshold are marked insufficient rather
      than defaulted to `0`/`[]`/`50`.
- [ ] Return `history_days` and a sufficiency flag from `/api/analytics/:cardId/summary` and
      `/api/analytics/:cardId/indicators`.
- [ ] Update `ArcaScoreBadge`, `RiskMetrics`, and `TechnicalSummary` to render a "building
      history — N of {threshold} days" state when insufficient, instead of a dash or a value.
- [ ] Re-run `scripts/seed-analytics.ts` against a DB with only real `price_history` rows and
      confirm no card shows a numeric score/indicator/vol figure it doesn't have enough days for.

## Validation gates
- [ ] happy path: a card with ≥ the threshold days of real `price_history` shows a real computed
      ARCA Score, indicators, and vol figure, and the API response's `history_days` matches the
      actual count of distinct real days for that card.
- [ ] edge cases: a card sitting exactly at the threshold (e.g. day 30 of 30) shows the computed
      value, and a card at threshold-minus-one still shows the "building history" state — the
      boundary is inclusive/exclusive consistently across all metrics using it.
- [ ] errors: `/api/analytics/:cardId/summary` for a card with zero `price_history` rows returns a
      well-formed "insufficient history" response (not a 500, not a fabricated `0` score
      indistinguishable from a real zero).
- [ ] coverage: grep confirms no reference to `jitter(` or a synthetic-history loop remains in
      `scripts/seed-prices.ts` or anywhere in the analytics path, and a search of
      `client/src/components/analytics/` confirms every component that renders a score,
      indicator, or vol number checks the sufficiency flag before rendering a value.

<!-- foundry-ticket: ee3302b59879d135 -->

<!-- foundry-ticket: ee3302b59879d135 -->

<!-- foundry-ticket: ee3302b59879d135 -->

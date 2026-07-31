# PRP — real-history-honest-gaps

## Intent
Every indicator, the ARCA Score, and every vol/risk number in the terminal is computed only
from real accumulated price snapshots — never from fabricated data — and any card/metric
that doesn't yet have enough real history shows a plain "building history — N of M days
collected" state instead of a number that looks trustworthy but isn't.

## Context
- **The synthetic source:** `scripts/seed-prices.ts`, `persistAndGenerateHistory()`
  (lines 173–249). Step 1 fetches a real current price per card (writes `card_prices`
  only). Step 2 (lines 225–247) then walks *backwards* 30 days from that real price using
  `jitter()` (Box-Muller noise, lines 41–49) and inserts 30 fabricated rows into
  `price_history` per card, timestamped `now - day * DAY_MS`. This is the only source of
  historical `price_history` rows in the repo today — every OHLC bar, indicator, vol
  number and ARCA Score currently downstream of it is fabricated.
- **The real pipeline already exists and is already wired up** (ARCA-4/5, confirmed
  working, not something to build): `modules/pricing/jobs.ts` `syncPrices()` /
  `persistPrices()` (lines 104–163) snapshots real provider prices into `price_history`
  with `recorded_at: now` on every run, and is registered in `server.ts:102` via
  `registerPricingJobs()` on a 6-hour interval (`jobs.ts:465`). It currently only covers
  *held* cards (`getHeldCardRefs()`, `jobs.ts:39,274`) — full-catalog coverage is
  ARCA-24/the bulk-daily-price-feed-plan ticket, out of scope here.
- **No provider can backfill the past** (checked per venture knowledge): PriceCharting
  has no historic-price API even on its paid tier; TCGdex only exposes rolling
  `avg1/7/30` on raw-card current pricing, not a real daily series; pokemon-tcg.io has no
  history at all. This confirms the only honest fix is forward accumulation from today,
  matching the ticket's own framing — no code path should attempt to backfill.
- **A second, less obvious fabrication point:** `modules/analytics/ohlc.ts`,
  `generateOHLCFromCurrentPrices()` (lines 117–174), called from `generateOHLCForDate()`
  (lines 86–88) whenever a date has zero `price_history` rows. It fabricates an OHLC bar
  from *today's* current `card_prices` snapshot and backdates it to whatever date was
  requested. `scripts/seed-analytics.ts`'s `backfillOHLC(days)` (default 30, called from
  `seed-analytics.ts:24-26`) loops over the past 30 dates — once the synthetic seed above
  is removed, every one of those dates has zero real rows, so this fallback would silently
  paint 30 identical proxy bars from today's price onto the past. This must be closed too,
  or the "no padding/approximation" requirement is violated by a different code path.
- **Where "enough real data" is not currently enforced:**
  - `modules/analytics/indicators.ts` (`sma`, `ema`, `rsi`, `macd`, `bollingerBands`,
    `atr`, `roc`) already correctly withhold output until `bars.length >= period` —
    no bug here, this part is already honest.
  - `modules/analytics/jobs.ts:82` (`computeIndicatorsForCard`) only gates on
    `bars.length < 5` before calling any indicator — harmless (the per-indicator checks
    above still apply) but not itself a threshold.
  - `modules/analytics/card-analytics.ts` (`parkinsonVolatility`, Sharpe, max drawdown —
    each only requires `bars.length >= 2`, `card-analytics.ts:238` gates the whole
    function on `bars.length === 0`) will happily emit a "real" vol/Sharpe/drawdown number
    off 2–3 days of real data and store it in `card_analytics` — statistically
    meaningless but indistinguishable from a mature number once on screen.
  - `modules/analytics/arca-score.ts:133` (`computeArcaScore`) only returns `0` when
    `bars.length === 0`; anywhere from 1 bar upward it computes and stores a 0–100 score
    that looks like a real, considered rating.
  - `modules/analytics/schema.ts:47-63` (`cardAnalytics` table) has no column recording
    how many real days backed the stored numbers, so the frontend has no way to tell
    "mature" from "just started" once a row exists.
- **Frontend today only distinguishes "no analytics row at all" vs "row exists":**
  `client/src/pages/CardDetailPage.tsx` lines 264–304 gate `TechnicalSummary`,
  `RiskMetrics`, and `ArcaScoreBadge` on `analytics &&` / `analytics?.arca_score != null`.
  Once a row exists (even off 1–2 real days), it's rendered as fully legitimate — there is
  no intermediate "building history" state anywhere in `ArcaScoreBadge.tsx`,
  `RiskMetrics.tsx`, or `TechnicalSummary.tsx`.
- `modules/analytics/handlers.ts:101-119` (`GET /analytics/:cardId/summary`) returns the
  raw `cardAnalytics` row or a 404 — no real-day-count is exposed today.

## Approach
Smallest correct change: stop generating fake history, stop approximating missing history,
add one integer column recording how many real days backed a stored analytics row, raise
the existing "some data" checks to per-metric real thresholds, and add one shared
"building history" UI state that's used wherever a number would otherwise appear.

Files touched:
- `scripts/seed-prices.ts` — delete the backward random-walk block in
  `persistAndGenerateHistory()` (the `for (day = HISTORY_DAYS; day >= 1; day--)` loop and
  its `price_history` insert); keep the real current-price fetch into `card_prices`
  untouched. Add a one-time purge of existing `price_history` rows (plus derived
  `card_ohlc_daily` / `technical_indicators` / `card_analytics` rows) so any DB that
  already ran the old seed isn't left with fabricated rows masquerading as real
  accumulated history once the generator is gone.
- `modules/analytics/ohlc.ts` — stop `generateOHLCForDate()` from calling
  `generateOHLCFromCurrentPrices()` to backfill dates with zero `price_history` rows; a
  date with no real snapshot simply produces no bar. Keep (or drop, if unused afterward)
  the function only if a genuine same-day use remains — otherwise remove it.
- `modules/analytics/schema.ts` — add a nullable `real_days` integer column to
  `cardAnalytics`, set from `bars.length` at computation time.
- `modules/analytics/card-analytics.ts` — define the real-history minimum (30 days, matching
  the ticket's own example and the longest lookback in use), skip writing
  vol/Sharpe/drawdown/trend/ARCA-Score inputs until `bars.length` meets it, and always
  record `real_days` regardless.
- `modules/analytics/arca-score.ts` — same threshold; return/store `null` (not `0`) when
  below it, so a missing score is never confused with a real bad score.
- `modules/analytics/handlers.ts` — include `real_days` (and the threshold) in the
  `/summary` response so the frontend can render progress without a second request.
- `client/src/components/analytics/ArcaScoreBadge.tsx`,
  `RiskMetrics.tsx`, `TechnicalSummary.tsx`, `client/src/components/charts/IndicatorPane.tsx`
  — add a shared "building history — N of 30 days collected" state, shown whenever
  `real_days` is below threshold, in place of the numeric display.
- `client/src/pages/CardDetailPage.tsx` — pass `real_days`/threshold through to the panels
  above instead of only gating on `analytics &&`.

## Tasks
- [ ] Remove the synthetic random-walk generator from `scripts/seed-prices.ts`, leaving only the real current-price fetch.
- [ ] Add a one-time purge of existing fabricated `price_history`/derived OHLC/indicator/analytics rows so no stale synthetic data survives the change.
- [ ] Remove the current-price OHLC fallback's use for backfilling missing historical dates in `modules/analytics/ohlc.ts`.
- [ ] Confirm `registerPricingJobs()`'s 6-hourly `syncPrices()` is running and writing real `price_history` snapshots starting today.
- [ ] Add `real_days` to `card_analytics` and populate it from real OHLC bar count whenever analytics are computed.
- [ ] Gate volatility/Sharpe/drawdown/trend computation in `card-analytics.ts` on a real-history minimum instead of `bars.length === 0`.
- [ ] Gate ARCA Score computation in `arca-score.ts` on the same minimum, storing `null` instead of `0` below threshold.
- [ ] Expose `real_days` and the threshold from the `/analytics/:cardId/summary` endpoint.
- [ ] Add a "building history — N of M days collected" state to the ARCA Score badge, risk metrics, technical summary, and indicator pane components, wired through `CardDetailPage.tsx`.

## Validation gates
- [ ] happy path: a card with ≥30 real accumulated `price_history` days shows a numeric ARCA Score, vol, Sharpe, drawdown, and all indicators, and every value traces to real `price_history` rows (none from `seed-prices.ts` or the removed OHLC fallback).
- [ ] edge cases: a card with real history below the threshold (e.g. 5 of 30 days) shows "building history — 5 of 30 days collected" instead of a score/number on every surface that used to show one (card detail's ARCA Score panel, risk metrics, technical summary, indicator pane); a card with zero real history shows the same state at 0, not a blank panel or a `0` score.
- [ ] errors: running `scripts/seed-prices.ts` after the change inserts no rows into `price_history` beyond the real current fetch, and running `scripts/seed-analytics.ts`'s backfill on a fresh real-only dataset produces zero OHLC bars for dates with no real snapshots (no silent fallback data).
- [ ] coverage: grep confirms no remaining reference to the removed random-walk block or `generateOHLCFromCurrentPrices`-as-backfill in the codebase, and every place `arca_score`, `volatility_e6`, `sharpe_e6`, `max_drawdown_bp`, or an indicator value is rendered in `client/` is reachable only through the new `real_days`-gated path.

<!-- foundry-ticket: 824a18be8b21a138 -->

# ARCA-27 — Real historical price ingestion

**Status:** Planned · **Area:** Analytics · **Depends on:** ARCA-8

## Context
Analytics currently sit on SYNTHETIC data: `seed-prices.ts` fabricates a 30-day random walk, so every indicator/score is computed on generated series (flagged in docs/analytics-continuation-prompt.md).

## Scope
- Ingest real historical prices (provider history endpoints and/or accumulated snapshots).
- Replace synthetic seed history with real series for OHLC/indicators/scores.
- Backfill history for the covered universe.

## Acceptance criteria
- [ ] ARCA Score, indicators and vol are computed on real price history.
- [ ] The synthetic random-walk seed is no longer on the analytics path.

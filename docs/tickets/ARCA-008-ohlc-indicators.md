# ARCA-8 — OHLC synthesis & technical indicators

**Status:** Shipped · **Area:** Analytics · **Depends on:** ARCA-5

## Context
Turn price history into candles and the standard technical indicator set.

## Scope
- `ohlc.ts` (daily OHLC + backfill); `indicators.ts`: SMA/EMA/RSI/MACD/Bollinger/ATR/ROC (integer `_e6`).

## Acceptance criteria
- [x] Every priced card yields OHLC + indicator series.

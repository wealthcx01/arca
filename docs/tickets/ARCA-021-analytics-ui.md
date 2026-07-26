# ARCA-21 — Analytics & card-detail terminal UI

**Status:** Shipped · **Area:** Client/UI · **Depends on:** ARCA-8

## Context
Surface the analytics as a dense, chart-rich terminal.

## Scope
- `AnalyticsPage` (Market/Screener/Portfolio tabs) + 8 analytics + 6 chart components.
- `CardDetailPage`: candlestick + RSI/MACD panes, technical summary, risk, grading alpha, source attribution.
- Charts via `lightweight-charts` v5 + `recharts`.

## Acceptance criteria
- [x] Analytics and card-detail render as interactive terminal panels.

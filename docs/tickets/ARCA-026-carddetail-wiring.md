# ARCA-26 — Finish card-detail data wiring

**Status:** In progress · **Area:** Client/UI · **Depends on:** ARCA-21

## Context
Known loose ends on `CardDetailPage`: RSI needs a separate indicators call, and `AddHoldingDialog` is invoked with an empty `portfolioId`.

## Scope
- Wire the indicators call so RSI/MACD render without a manual refresh.
- Pass a real `portfolioId` (or a picker) from card-detail into `AddHoldingDialog`.

## Acceptance criteria
- [ ] Card-detail indicators render on load; add-to-portfolio targets a real portfolio.

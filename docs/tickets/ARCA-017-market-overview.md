# ARCA-17 — Market overview, movers, alerts, ticker

**Status:** Shipped · **Area:** Market/News · **Depends on:** ARCA-5

## Context
The TRKD-style market cockpit.

## Scope
- `modules/market`: `/overview`, `/movers`, `/alerts` (>5% moves), `/ticker`, `/graded`.
- Client `OverviewPage` (3-column terminal) + `RollingTicker`.

## Acceptance criteria
- [x] Overview page shows movers, alerts and a live-ish ticker.

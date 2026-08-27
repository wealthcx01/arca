# ARCA-64 — Show "last updated" time next to each price on the card page

**Status:** In progress · **Area:** Cards · **Depends on:** ARCA-4

## Why this matters (for the founder)
Traders need to know if a price is current before they act on it. Right now the card page shows a price with no indication of when it was last refreshed, which makes it impossible to judge trust at a glance.

## Context
Price data is already persisted with source attribution via the provider registry (ARCA-4, `providers/registry.ts`, `card_prices` + `price_history`), so a last-updated timestamp exists per price and doesn't need new plumbing to capture — this is a display change. Coverage/refresh cadence is uneven right now (ARCA-24: only held cards are priced on a schedule; full-catalog daily coverage is still being planned), which is exactly why surfacing freshness to the user matters today rather than waiting for that to be solved.

## Scope
- Show a relative "updated X ago" label next to each price shown on the card page (e.g. "updated 2h ago", "updated 3d ago").
- If a price has no timestamp, or the timestamp is older than a set staleness threshold, show a clear "no recent update" style flag instead of a misleading exact time.
- Apply consistently across all prices shown on the card page (e.g. if multiple sources/conditions are shown).

## Out of scope
- Changing how often prices are actually fetched or refreshed.
- Changing which providers are used or how conflation/attribution works.
- Adding freshness indicators anywhere outside the card page (e.g. screener, portfolio) — that's a separate piece of work if wanted.

## Acceptance criteria
- [ ] Every price shown on the card page has a visible "last updated" label next to it.
- [ ] The label reflects the true timestamp of that price's last refresh, not page load time.
- [ ] Prices with missing or very stale timestamps show a clear "no recent update" indicator instead of a fake-looking time.

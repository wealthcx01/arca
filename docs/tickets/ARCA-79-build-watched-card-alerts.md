# ARCA-79 — Build: price alerts on watched cards

**Status:** Todo · **Area:** Watchlist · **Depends on:** ARCA-78 (research-price-alert-rules)

## Why this matters (for the founder)
Traders already watch cards in ARCA; this lets them set a price point and get told when it's hit, instead of checking manually.

## Context
Builds on the shipped watchlist (ARCA-19, `modules/watchlist`, price-enriched, ownership-scoped) and existing pricing data (ARCA-4 provider registry). Implements exactly the trigger type, price source, notification channel, and lifecycle decided in the research ticket (ARCA-78) — no new decisions made here.

## Scope
- Let a user set an alert (threshold/% per research spec) on any card already on their watchlist.
- Store alerts per user, scoped to their own watchlist items.
- Evaluate alerts against price updates and surface a triggered alert in-app.
- Let a user edit/delete an alert.

## Out of scope
- Any notification channel beyond in-app (per existing ARCA v1 scope).
- Alerts on cards not on a watchlist.
- Redesigning the watchlist UI itself or the News tab (tracked separately in ARCA-55).

## Acceptance criteria
- [ ] A user can set, edit, and delete a price alert on a watched card.
- [ ] Alerts trigger in-app when the condition from the research spec is met.
- [ ] Alerts are private to the user who set them.
- [ ] No change to existing watchlist CRUD or price-enrichment behavior.

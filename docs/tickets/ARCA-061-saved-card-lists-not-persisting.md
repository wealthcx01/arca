# ARCA-61 — Saved card lists not persisting to signed-in account

**Status:** Todo · **Area:** Watchlist · **Depends on:** ARCA-19

## Why this matters (for the founder)
People lose their saved card lists after logging back in, which breaks trust in the product immediately. Lists should belong to the account and just be there every time.

## Context
Watchlists were shipped as "ownership-scoped" in ARCA-19 (`modules/watchlist`: watchlist + item CRUD, ownership-scoped, price-enriched). Auth is already session-based (bcrypt + cookies, `/api/auth/*`). Since the backend is designed to scope lists by owner, the reported symptom (lists vanish on re-login) points to a client-side or wiring bug — e.g. `WatchlistPage.tsx` not fetching/saving against the authenticated user's watchlist_id, a missing session check before save, or a fallback to local/anonymous storage — rather than a missing feature.

## Scope
- Audit the watchlist read/write path end to end: client `WatchlistPage.tsx` → API → `modules/watchlist` → DB, confirming every save and load uses the signed-in user's own watchlist.
- Fix whatever is breaking that chain (e.g. missing user id on save, anonymous/local fallback, session not checked, wrong or default watchlist_id).
- Ensure a user who adds cards, logs out, and logs back in (same device or a different one) sees the same list.

## Out of scope
- Sign-in, sign-up, and password/session handling (already working).
- New list features: compare view, export, list types by set/rarity/grade (that's ARCA-39).
- Any visual/layout changes to the watchlist page.

## Acceptance criteria
- [ ] A signed-in user's added/removed cards are saved against their account, not local/anonymous state.
- [ ] Logging out and back in (or on a different device) shows the same saved list.
- [ ] No regression to existing watchlist add/remove/reorder functionality.

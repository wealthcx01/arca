# ARCA-51 — Cards page crashes on every load (API response shape mismatch)

**Status:** Todo · **Area:** Client/UI · **Depends on:** —

## Why this matters (for the founder)
Cards is one of the twelve primary nav tabs — the card catalog is the product's core inventory. It
is currently broken for every single user, every single time, on every screen width. Anyone who
clicks the second item in the nav bar sees "Something went wrong loading this page" instead of the
catalog.

## Context
Found during the ARCA-43 UI/UX audit (fresh account, zero seeded portfolio data, real running
instance at `localhost:5173`/`:3001`). Steps taken: signed up, clicked "Cards" in the nav bar.

**What happened:** the page immediately renders the app-wide error boundary fallback ("Something
went wrong loading this page." with Reload / Back to Overview buttons) instead of the card list.
Confirmed at all three audited widths (1024, 1280, 375) — 100% reproducible, not a race condition.

**Console error:**
```
TypeError: Cannot read properties of undefined (reading 'toLocaleString')
    at CardsPage (client/src/pages/CardsPage.tsx:163)
ErrorBoundary caught an error: TypeError: Cannot read properties of undefined (reading 'toLocaleString')
```

**Root cause:** `GET /api/cards` returns `{"data": [...], "pagination": {"page":1,"limit":20,
"total":502,"totalPages":26}}` (confirmed via `curl http://localhost:3001/api/cards?page=1&limit=20`).
`CardsPage.tsx` (`client/src/pages/CardsPage.tsx:61-66`) reads the response as
`{ data: Card[]; total: number; page: number }` and calls `setTotal(res.total)` — `res.total` is
`undefined` because the real field is nested at `res.pagination.total`. The card list (`res.data`)
happens to be read correctly since that key matches, which is why this wasn't caught until the page
actually tries to render `{total.toLocaleString()} cards found` at line 163.

**Expected:** the Cards page renders the paginated card catalog (502 cards, 26 pages).
**Actual:** the page crashes on first render and only the generic ErrorBoundary fallback is shown;
the catalog is completely unreachable through the UI.

**Reproduce:** sign in, click "Cards" in the top nav (or navigate to `/cards`) at any viewport width.

## Scope
- Fix `CardsPage.tsx` to read pagination fields from `res.pagination` (`total`, `page`, `totalPages`)
  instead of the top level of the response.
- Audit other client code paths that call `/api/cards` (list endpoint) for the same assumption.
- Add a regression check (unit or e2e) that loads `/cards` and asserts the catalog renders with a
  non-crashing total count.

## Out of scope
- The `/api/cards/:id` single-card endpoint's response shape (separate bug, see ARCA-53).
- Any redesign of the Cards page beyond restoring correct rendering.

## Acceptance criteria
- [ ] Visiting `/cards` as any signed-in user renders the card grid/list and a correct total count,
      with no ErrorBoundary fallback and no console error.
- [ ] Confirmed working at 1024, 1280, and 375 widths.
- [ ] Pagination controls reflect the real total (502 cards / 26 pages at time of audit).

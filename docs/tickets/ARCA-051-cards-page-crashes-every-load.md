# ARCA-51 — Cards page crashes on every load (API response shape mismatch)

**Status:** Shipped — fixed under ARCA-50, closed 2026-08-20 · **Area:** Client/UI · **Depends on:** —

> **Closed because the crash no longer exists, not because this ticket was worked.**
>
> The fix landed as a side effect of **ARCA-50** (#46, merged 2026-08-19), which changed
> `CardsPage.tsx` to read `res.pagination.total` while making set names render. By the time the lane
> picked this ticket up, the bug it describes was already gone — which is why #48, the run against
> this ticket, ended up correcting a *different* file (`CardSearch.tsx`) that carried the same wrong
> type inertly.
>
> Leaving it open would mean the board showing a founder a broken Cards page that is not broken.

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
- [x] Visiting `/cards` renders the catalog with a correct total count and no ErrorBoundary.
      `CardsPage.tsx:65` now reads `setTotal(res.pagination.total)`, and `total` is a `useState(0)`,
      so line 163's `total.toLocaleString()` cannot receive `undefined` even if the field were
      absent. The exact mechanism in the console trace above is gone.
- [ ] **Confirmed at 1024, 1280 and 375 widths — not re-verified here.** ARCA-50's run checked the
      page in a browser; this closure is from reading the code path and the API contract, and no
      instance was running to check against. Left unticked rather than claimed.
- [x] Pagination reflects the real total — same corrected read, and `modules/cards/handlers.test.ts`
      asserts the endpoint's shape in CI so it cannot silently drift back.

## What the scope asked for, and where each part went

- **Fix `CardsPage.tsx`** → ARCA-50 (#46).
- **Audit other client callers of `/api/cards`** → #48 corrected `CardSearch.tsx`, which declared
  `{ data; total }` against the same endpoint. It never read `res.total`, so it was a latent trap
  rather than a second crash. `CardDetailPage.tsx` uses `/cards/:id`, explicitly out of scope here.
- **Add a regression check** → `scripts/e2e-playwright.pw.ts` (#48) loads `/cards` and asserts a real
  total renders. **It does not run in CI yet** — the browser suite needs a seeded catalog and a
  running stack, which is **ARCA-66**. Until that lands the guard exists but is not enforced.

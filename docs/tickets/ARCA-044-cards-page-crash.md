# ARCA-44 — Cards nav route crashes to the error boundary for every user, every time

**Status:** Planned · **Area:** Frontend/Bug · **Depends on:** ARCA-3, ARCA-21

## Context
Filed from the ARCA-43 UI/UX audit. `app-wide-error-boundary.md` already documents the founder
seeing this exact crash and explicitly calls out "fixing the specific underlying bug that currently
crashes CardsPage on fresh load" as a separate ticket — this is that ticket.

## What I did
Signed up a brand-new account (no manual seeding) and clicked "Cards" in the primary nav, on a
freshly seeded database (502 cards, 439 priced). Also reached the page directly at
`http://localhost:5173/cards`. Reproduced identically at 1280, 1024, and 375px widths, and from the
"Browse the catalog" CTA links on the Overview page (`Price Chart` and `Market Intel` empty-state
panels both link to `/cards`).

## What happened
The page renders the nav shell, then immediately fails with:
```
TypeError: sets.map is not a function
    at CardsPage (client/src/pages/CardsPage.tsx:156:18)
ErrorBoundary caught an error: TypeError: sets.map is not a function
```
The `ErrorBoundary` (ARCA app-wide-error-boundary work) catches it cleanly and shows "Something went
wrong loading this page" with Reload / Back to Overview buttons — so it's not a blank white screen —
but the entire card catalog, one of the 12 primary nav destinations, is 100% unusable.

Root cause: `GET /api/cards/sets` returns `{"data": [...]}` (confirmed via
`curl http://localhost:3001/api/cards/sets`), but `client/src/pages/CardsPage.tsx:44-47` does:
```ts
api.get<SetInfo[]>("/cards/sets").then(setSets)
```
treating the response as a bare array instead of unwrapping `.data`. Every other page that calls the
same endpoint (`SetsErasPage.tsx`, `GradedMarketPage.tsx`, `ScreenerPage.tsx`) correctly types it as
a wrapper (`SetsResponse`) and unwraps `.data` — only `CardsPage.tsx` has the bug. The `api.get`
helper (`client/src/lib/api.ts`) never unwraps automatically, so this is purely a call-site bug.

## What I expected
The card catalog to render a searchable/filterable grid of the 502 seeded cards, matching the other
pages that already consume `/cards/sets` correctly.

## Repro steps
1. Sign up / sign in.
2. Click "Cards" in the nav (or visit `/cards` directly), at any viewport width.
3. Observe the error-boundary fallback and the `sets.map is not a function` console error.

## Why this is the top finding
This is the single most damaging first-impression bug: Overview's own "Browse the catalog" CTA — the
most natural next step after landing on an empty account — sends a new user straight into this
crash. See ARCA-43's first-five-minutes judgement.

## Suggested fix (not applied here — audit only)
`CardsPage.tsx:45` — change `.get<SetInfo[]>("/cards/sets").then(setSets)` to unwrap `.data` like the
other three call sites do, and align the `SetInfo` field name (`count`) with what the API actually
returns (`card_count`, per `curl` output above) so the "CARDS" column doesn't silently read
`undefined` once the crash is fixed.

## Acceptance criteria
- [ ] `/cards` renders the card grid/list for a freshly seeded, unseeded-user account without error.
- [ ] No console error on load.
- [ ] The set filter dropdown is populated and functional.

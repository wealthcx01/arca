# ARCA-50 — Show set name on card pages

**Status:** Shipped · **Area:** Client/UI · **Depends on:** ARCA-3

## Why this matters (for the founder)
Right now users can't tell two similarly-named cards apart because the set isn't visible. Showing the set clearly makes the card list and card detail pages trustworthy and usable, especially for graded-card collectors who care a lot about set/edition.

## Context
The card catalog (ARCA-3, shipped) already ingests and stores set data per card, and the API supports filtering/searching by set. The `CardsPage` and `CardDetailPage` (ARCA-21, shipped) do not currently surface the set name in the UI, even though the data is available. This is a display gap, not a data gap.

## Scope
- Show the set name on each card row/tile in the card list (`CardsPage`).
- Show the set name prominently near the card title on `CardDetailPage`.
- If a set symbol/icon is available in the existing data, display it next to the set name; otherwise text-only is fine.

## Out of scope
- Any changes to card search/filter logic (already supports filtering by set).
- Any changes to pricing, analytics, or chart panels on the card detail page.
- Ingesting new set data or artwork.

## Acceptance criteria
- [x] Every card shown in the card list displays its set name.
- [x] The card detail page displays the set name near the card name/title.
- [x] No changes to existing search, filter, or analytics behavior.

## Verification notes
The set-name rendering itself (`CardsPage.tsx`, `CardDetailPage.tsx`) already existed, but was unreachable: both pages crashed via their `ErrorBoundary` before any card could render, due to response-shape mismatches between the API and the client (`/cards/sets` and `/cards/:id` both wrap their payload in `{ data: ... }`, and `/cards` returns pagination totals nested under `pagination.total`, but the client read those fields unwrapped). Fixed the three mismatches in `CardsPage.tsx`/`CardDetailPage.tsx` so the pages render at all, confirmed set name now shows on every card in grid and list view and in the card detail header via a live browser check, and added automated coverage in `modules/cards/handlers.test.ts` asserting `set_name` is present on every `/api/cards` and `/api/cards/:id` response.

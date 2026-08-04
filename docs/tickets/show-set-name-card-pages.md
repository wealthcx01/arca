# ARCA-NEW — Show set name on card pages

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

## Resolution notes
The JSX for set name display already existed from ARCA-3/ARCA-21 (`CardsPage` grid subtitle, list "Set" column; `CardDetailPage` header bar). Verifying against seeded data in a browser found that both pages were actually broken before any set name could render, due to a pre-existing client/server response-shape mismatch (unrelated to set names):
- `CardsPage` expected `GET /cards/sets` to return a bare array; the server returns `{ data: [...] }`, so `sets.map` threw and the whole page crashed to the error boundary.
- `CardsPage` also expected `res.total` from `GET /cards`; the server nests it under `res.pagination.total`, leaving pagination broken.
- `CardDetailPage` expected `GET /cards/:id` to return the card directly; the server returns `{ data: card }`, so `card.name`/`card.set_name`/`card.card_number`/`card.rarity` all silently rendered blank.

Fixed the response unwrapping in `client/src/pages/CardsPage.tsx` and `client/src/pages/CardDetailPage.tsx` to match the server's actual shape (consistent with how `SetsErasPage`/`ScreenerPage`/`GradedMarketPage` already consume `/cards/sets`). Re-verified in a real browser against seeded data: grid tiles, list "Set" column, and the detail page header bar all now show the set name (e.g. "Base Set", "Test Set"). No cards in the current seeded data have a null/empty `set_name`. A nonexistent card ID still shows "Failed to load card" without crashing.

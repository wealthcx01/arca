# ARCA-53 — Card detail page shows no card name, set, or image (API response shape mismatch)

**Status:** Shipped · **Area:** Client/UI · **Depends on:** —

## Why this matters (for the founder)
Card detail is one of the required routes for every collector — it's where someone lands after
searching or clicking a card anywhere in the app (News alerts, Graded, Screener, ticker). Right now
it loads without crashing, but shows a card with no name, no set, and a broken image icon where the
card art should be — for every single card, every time. It looks like the catalog data is missing
even though it isn't.

## Context
Found during the ARCA-43 UI/UX audit. Steps taken: fetched a real card id via the API
(`GET /api/cards?limit=1` → `ht254dhrynyj`, "Absol", set "Dragon", card_number "1"), navigated to
`/cards/ht254dhrynyj` directly (working around ARCA-51's Cards-page crash, which otherwise makes
this route unreachable through normal navigation).

**What happened:** the terminal header bar renders as `← CARDS | | #  | US$41.76 | —` — the card
name, set name, and card number are all blank. The card art panel shows the broken-image icon
(`ImageOff` fallback) instead of the card's image, even though the card has a valid `image_url`.
Confirmed at 1024, 1280, and 375 widths (same result each time). No console error is thrown — the
page doesn't crash, it just silently renders blank fields, which is easy to miss without comparing
against the raw API response.

**Root cause:** `GET /api/cards/:id` returns `{"data": {"id":"ht254dhrynyj","name":"Absol",
"set_name":"Dragon","set_code":"ex3","card_number":"1","image_url":"https://images.pokemontcg.io/
ex3/1.png", ...}}` (confirmed via curl). `CardDetailPage.tsx` (`client/src/pages/CardDetailPage.tsx:
97`) calls `api.get<Card>(`/cards/${cardId}`)` and stores the result directly as `card` — but the
real payload is wrapped in `{ data: ... }`, so every field read off `card` (`card.name`,
`card.set_name`, `card.card_number`, `card.image_url`, `card.rarity`) is `undefined`. This is the
same class of bug as ARCA-51 (list endpoint envelope mismatch), on the single-card endpoint instead.

**Expected:** the card detail page shows the card's name, set name and number, and artwork.
**Actual:** all three are blank/broken on every card detail view, silently.

**Reproduce:** with the Cards-page crash (ARCA-51) worked around, navigate directly to any
`/cards/:id` URL for a real card id and observe the header bar and image panel.

## Scope
- Fix `CardDetailPage.tsx` to unwrap the `{ data: ... }` envelope from `GET /api/cards/:id` before
  using the result as the `Card` object.
- Confirm the price/analytics side panels (which already read correctly, since `/pricing/:id/
  conflated` and friends aren't wrapped) are unaffected.
- Add a regression check that loads a real card detail page and asserts the card's name is visible.

## Out of scope
- Also showing the set name on the card *list* page (`CardsPage`) — that's ARCA-50, already
  backlogged, and currently unverifiable anyway because the Cards page doesn't render at all
  (ARCA-51).
- The garbled price-scale label rendered in the bottom-left corner of the OHLC chart on this same
  page — noted separately in ARCA-56 since it also affects the Analytics page's chart.

## Acceptance criteria
- [x] Any `/cards/:id` page shows the card's real name, set name, card number, and rarity in the
      header.
- [x] The card artwork renders instead of the broken-image placeholder, for cards with a valid
      `image_url`.
- [x] Confirmed working at 1024, 1280, and 375 widths.

## Verification notes
The envelope-unwrap fix this ticket describes was already shipped under ARCA-50 (commit `b9cd3ea`),
which changed `CardDetailPage.tsx:97` to `api.get<{ data: Card }>(...).then((d) => d.data)` — the
same commit also fixed ARCA-51's `CardsPage` crash, so the "navigate around the crash" workaround
this ticket's repro steps describe is no longer needed either. `git diff master --
client/src/pages/CardDetailPage.tsx` on this branch is empty: no production code change was needed.

This pass closed the regression-coverage gap instead: `modules/cards/handlers.test.ts` now asserts
`name`, `card_number`, and `image_url` (not just `set_name`) are non-empty on `GET /api/cards/:id`,
plus a 404 case. Added `scripts/card-detail-identity.pw.ts`, a Playwright regression suite that
fetches a real card id via the API and navigates directly to `/cards/:id` (independent of `CardsPage`
health), asserting the header shows name/set/number/rarity and the artwork renders as an `<img>` (not
the `ImageOff` placeholder) at 1024, 1280, and 375 widths, plus an unknown-id case. Manually confirmed
in the running app that the price (conflated/all-sources/graded) and analytics (technical summary,
risk metrics, ARCA score) side panels still populate on the same page load — they were never affected
since they're fetched and unwrapped independently of the `card` state.

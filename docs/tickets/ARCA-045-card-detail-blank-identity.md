# ARCA-45 — Card detail page silently renders with no card name, set, or image

**Status:** Planned · **Area:** Frontend/Bug · **Depends on:** ARCA-21, ARCA-26

## Context
Filed from the ARCA-43 UI/UX audit. Since `/cards` itself crashes (ARCA-44), the only way a new user
reaches a card detail page is via a direct URL or by clicking a row in Top Movers / Price Alerts /
Screener — and when they land there, the page is silently broken rather than erroring.

## What I did
From a freshly signed-up, unseeded account, visited `/cards/ht254dhrynyj` directly (an Absol from the
"Dragon" set, confirmed to exist via `curl http://localhost:3001/api/cards/ht254dhrynyj`). Repeated
at 1280, 1024, and 375px widths.

## What happened
The page renders — no error boundary, no crash — but the terminal header bar that should read
`CARDS | Absol | Dragon #1 | Rare Holo | $161.93` instead reads:
```
CARDS | | | # | | US$41.76 | | —
```
Card name, set name, card number, and rarity are all blank. The card-image panel on the right shows a
broken-image placeholder icon in a large empty box for the entire page height, at every width tested.
This happens for every card, not just this one — confirmed by visiting several other IDs.

Root cause: `client/src/pages/CardDetailPage.tsx:97` does:
```ts
api.get<Card>(`/cards/${cardId}`)
```
but `GET /api/cards/:id` returns `{"data": {...card...}}` (confirmed via curl), the same
response-wrapping mismatch as ARCA-44. Because the promise still *resolves* (just with the wrong
shape), `cardR.status === "fulfilled"` is true, so the page never shows its "Card not found" error
state — it silently renders with every card field `undefined`, which is worse than a visible crash:
there is nothing on the page telling the user which card they're looking at.

Also noted: the card-detail price chart (see ARCA-050) has a garbled overlapping numeral label in its
bottom-left corner, visible in this same page.

## What I expected
The card name, set, number, rarity, and image to render, matching the data returned by the API.

## Repro steps
1. Sign in.
2. Visit `/cards/ht254dhrynyj` (or any valid card id from `GET /api/cards`) directly.
3. Observe the blank header (`CARDS | | | # | | $price | | —`) and the broken-image placeholder.

## Suggested fix (not applied here — audit only)
Unwrap `.data` at `CardDetailPage.tsx:97` the same way `conflated`/`prices`/`graded_prices` already
do a few lines below it in the same `Promise.allSettled` block.

## Acceptance criteria
- [ ] Card detail page shows the correct name, set name, card number, and rarity in the header for
      any valid card id.
- [ ] Card image renders (or a labelled "no image available" state, not a bare broken-image icon).

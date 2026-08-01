# ARCA-NEW — Card image placeholder for missing/broken images

**Status:** Todo · **Area:** Client/UI · **Depends on:** —

## Why this matters (for the founder)
Right now, any card without an image (or where the image fails to load) shows a broken-image icon, which looks unfinished and undermines trust in a product meant to feel like a professional terminal. A clean placeholder keeps the product looking polished even when source data is incomplete.

## Context
Cards are ingested from the Pokemon TCG v2 API (see ARCA-3), and images are rendered on both the cards grid (`CardsPage`) and the card-detail page (`CardDetailPage`). Not every card record is guaranteed to have a working image URL, so both pages need a fallback for missing or broken images rather than relying on the browser's default broken-image icon.

## Scope
- Detect missing image URL or image load failure on `CardsPage` grid thumbnails and `CardDetailPage`.
- Show a designed placeholder (card-shaped frame, ARCA styling) instead of the browser's broken-icon, ideally showing the card name/set as text if no image is available.
- Apply consistently anywhere a card image is rendered today.

## Out of scope
- Sourcing, fixing, or backfilling missing images themselves.
- Changing the image ingestion pipeline from the Pokemon TCG API.

## Acceptance criteria
- [ ] Any card with no image URL shows the designed placeholder, not a broken-image icon.
- [ ] Any card whose image URL fails to load (404, network error) falls back to the same placeholder.
- [ ] Placeholder appears consistently on both the cards grid and card-detail page.

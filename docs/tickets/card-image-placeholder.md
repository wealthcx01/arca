# ARCA-NEW — Card image placeholder for missing images

**Status:** Todo · **Area:** Client/UI · **Depends on:** —

## Why this matters (for the founder)
Right now, cards without an image show a broken-image icon, which looks like the product is broken. A proper placeholder makes it look intentional and keeps the terminal feeling polished even when source data is incomplete.

## Context
Cards are stored with `image_url` and `image_url_hires` fields (see `db/seed.ts`), which are not always populated or reachable. Card images render across multiple surfaces — the card catalog, card-detail page, and analytics panels (ARCA-21, ARCA-3) — so the fix needs to be a single shared component used everywhere a card image appears, not a one-off fix on one page.

## Scope
- A shared "card image" component that detects a missing or failed-to-load image and renders a clean placeholder instead (e.g. card-shaped frame with the card's name/set as text).
- Applied everywhere card images currently render: catalog/search grid, card-detail page, analytics panels.
- Placeholder matches the terminal's visual style (not a generic browser icon).

## Out of scope
- Sourcing, fixing, or backfilling missing image data itself.
- Changing how images are ingested or stored.
- Image zoom/lightbox or other card-detail image features.

## Acceptance criteria
- [ ] Any card with a missing or broken `image_url` shows the new placeholder, not a broken-image icon, on catalog, search, card-detail, and analytics views.
- [ ] Placeholder is visually consistent with ARCA's terminal styling.
- [ ] No change in behavior for cards that already have a working image.

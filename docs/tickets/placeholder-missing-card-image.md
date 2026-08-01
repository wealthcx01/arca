# ARCA-NEW — Placeholder for cards with no image

**Status:** Todo · **Area:** Client/UI · **Depends on:** —

## Why this matters (for the founder)
Right now a missing card image shows a broken-icon graphic, which looks like a bug rather than a normal state. A proper placeholder makes the product look finished even when source data is incomplete.

## Context
Card images come from the Pokemon TCG ingest (ARCA-3) and are rendered on `CardsPage`, `CardSearch`, and `CardDetailPage`. Not every card in the source data has an image, and some image URLs may fail to load, so this needs to cover both "no image field" and "image failed to load" cases.

## Scope
- A single reusable placeholder component (card-shaped silhouette or ARCA mark, matching the dark terminal styling).
- Applied wherever card images render: cards grid, search results, card-detail page.
- Falls back automatically on missing image URL or on image load failure — no broken-icon ever shown.

## Out of scope
- Sourcing or fixing missing images themselves (data ingest is unchanged).
- Any change to image loading performance or lazy-loading behaviour.

## Acceptance criteria
- [ ] Any card without an image (or with a broken image URL) shows the placeholder, not a broken-icon.
- [ ] Placeholder appears consistently on cards grid, search, and card-detail page.
- [ ] Visual style matches existing terminal UI (dark background, no jarring grey box).

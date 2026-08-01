# ARCA-NEW — Placeholder image for cards with no artwork

**Status:** Todo · **Area:** Client/UI · **Depends on:** ARCA-3

## Why this matters (for the founder)
A broken-image icon looks like the site is malfunctioning, which undermines trust in a paid analytics terminal. A clean placeholder signals "no image available" instead of "something is broken."

## Context
Card data is ingested from the Pokemon TCG v2 API (ARCA-3) and rendered across `CardSearch`, `CardsPage`, and `CardDetailPage` (ARCA-21/26). Not every card in the catalog has artwork available from the source API, so missing images are an expected, recurring case rather than a bug to fix upstream.

## Scope
- A single reusable placeholder component/image used wherever a card image is missing or fails to load.
- Placeholder should be visually consistent with ARCA's existing terminal styling (not a generic browser icon).
- Applied consistently across card search results, card lists, and card-detail pages.

## Out of scope
- No change to how card images are sourced, fetched, or cached.
- No change to card data ingestion (ARCA-3).
- No per-card manual image uploads or overrides.

## Acceptance criteria
- [ ] Any card missing an image (or with a broken image URL) shows the same clean placeholder instead of a broken-icon graphic.
- [ ] Placeholder appears correctly in card search, card list, and card-detail views.
- [ ] No layout shift or visual glitch introduced where placeholders appear.

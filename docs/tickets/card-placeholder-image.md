# ARCA-NEW — Card placeholder image for missing artwork

**Status:** Todo · **Area:** Client/UI · **Depends on:** —

## Why this matters (for the founder)
Right now, cards without artwork show a broken-image icon, which looks like a bug and undermines trust in a paid analytics terminal. A proper placeholder makes missing images look intentional and on-brand.

## Context
Cards are ingested from the Pokemon TCG API (per ARCA-3, `modules/cards`) and rendered on the card search/catalog page and `CardDetailPage` (per ARCA-21). Not every card in the source data has an image URL, and there's currently no fallback handling for that case — the `<img>` tag just fails and the browser's default broken-image icon shows.

## Scope
- Add a placeholder image/component (card-shaped, matches ARCA's visual style) shown whenever a card's image URL is empty, null, or fails to load.
- Apply it consistently on the card search/catalog grid and on `CardDetailPage`.
- Handle both "no URL provided" and "URL provided but image fails to load" cases.

## Out of scope
- Sourcing or backfilling missing card images.
- Any change to the card ingest pipeline or data schema.
- Placeholder states for other entities (e.g. sets, portfolios) — cards only.

## Acceptance criteria
- [ ] Any card with no image URL shows the new placeholder, not a broken-image icon.
- [ ] Any card whose image URL fails to load (404, network error) falls back to the same placeholder.
- [ ] Placeholder appears correctly on both the card catalog/search view and card-detail view.

# ARCA-NEW — Placeholder for missing card images

**Status:** Todo · **Area:** Client/UI · **Depends on:** —

## Why this matters (for the founder)
Right now any card without an image (or with a broken image link) shows a browser's default broken-image icon, which looks unfinished. A proper placeholder keeps the terminal looking polished everywhere card art appears.

## Context
Card images come from the Pokemon TCG API ingest (`image_url` / `image_url_hires` fields in `db/seed.ts`), so any card missing art, or any dead/expired image link, currently falls through to the browser's native broken-image icon. Card images appear across `CardsPage`, `CardSearch`, `CardDetailPage`, and `WatchlistPage`.

## Scope
- Add a shared placeholder (card-shaped box, with set icon or card name, styled consistently with the terminal look) used wherever a card image is rendered.
- Detect both cases: no `image_url` present, and an `image_url` that fails to load.
- Apply it across card search results, card detail page, and watchlist.

## Out of scope
- No changes to how images are ingested, sourced, or stored.
- No image upload or manual image-fixing tools.

## Acceptance criteria
- [ ] A card with no image URL shows the placeholder, not a broken-image icon.
- [ ] A card whose image URL fails to load falls back to the same placeholder.
- [ ] Placeholder appears consistently on search, detail, and watchlist views.

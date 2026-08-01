# ARCA-NEW — Placeholder image for cards with no artwork

**Status:** Todo · **Area:** Client/UI · **Depends on:** —

## Why this matters (for the founder)
Right now a missing card image shows a broken-icon graphic, which looks unfinished and unprofessional. A clean placeholder keeps the catalog and card pages looking polished even when artwork is missing.

## Context
Cards are ingested from the Pokémon TCG v2 API (`modules/cards`, `db/seed.ts`), and `image_url` / `image_url_hires` are nullable fields in the schema — some cards will legitimately have no image. Card images currently render in `CardSearch` (search results) and `CardDetailPage` (detail view) with no fallback handling, so a missing or broken URL falls through to the browser's default broken-image icon.

## Scope
- Add a reusable placeholder component/graphic (e.g. a card-shaped outline with a generic icon) shown when `image_url` is missing, empty, or fails to load.
- Wire it into `CardSearch` results and `CardDetailPage`.
- Placeholder should adapt to the same size/shape as a real card image so layouts don't shift.

## Out of scope
- Sourcing, fetching, or fixing missing images themselves.
- Any change to the ingest pipeline or database schema.
- Per-set or per-card custom placeholder art.

## Acceptance criteria
- [ ] Any card with no `image_url` shows the placeholder, not a broken-image icon, on both search results and card detail.
- [ ] Any card whose image URL fails to load (e.g. broken link) also falls back to the placeholder.
- [ ] Placeholder matches the normal image's dimensions/aspect ratio so grids and detail layout stay unchanged.

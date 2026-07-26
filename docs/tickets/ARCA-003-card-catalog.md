# ARCA-3 — Card catalog: ingest, search, detail

**Status:** Shipped · **Area:** Cards · **Depends on:** ARCA-2

## Context
The universe of cards, sourced from the Pokemon TCG API, searchable and drillable.

## Scope
- Ingest from Pokemon TCG v2 (`modules/cards`, `db/seed.ts`).
- Search/filter API (q/set/rarity/supertype, paginated) + `/sets` + `/:id`.
- Client `CardsPage`, `CardSearch`, `CardDetailPage`.

## Acceptance criteria
- [x] Cards searchable by name/set/rarity; detail page renders.
- [x] Sets list with per-set counts.

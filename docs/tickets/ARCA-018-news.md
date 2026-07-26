# ARCA-18 — News module

**Status:** Shipped · **Area:** Market/News · **Depends on:** ARCA-2

## Context
Attach market news to cards.

## Scope
- `modules/news`: CRUD; `/news/:cardId` searches JSON `card_ids`; client `MarketNewsPage`.

## Acceptance criteria
- [x] News items post and render, filterable by card.

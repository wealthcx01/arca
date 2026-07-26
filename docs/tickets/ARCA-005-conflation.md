# ARCA-5 — Price conflation engine

**Status:** Shipped · **Area:** Pricing/ETL · **Depends on:** ARCA-4

## Context
LSEG-style field-level best-price selection across sources with per-field attribution.

## Scope
- `conflation.ts`: market/mid by source-priority, low=MIN, high=MAX; winner marked `conflated_rank=1`.
- API `/:cardId/conflated`, `/:cardId/graded`, `/:cardId/history`.

## Acceptance criteria
- [x] A card resolves to one conflated best-price with per-field source labels.

# ARCA-4 — Pricing providers & registry

**Status:** Shipped · **Area:** Pricing/ETL · **Depends on:** ARCA-2

## Context
Multi-source price ingestion behind a provider-registry abstraction.

## Scope
- Registry (`providers/registry.ts`, `types.ts`) + 6 providers: tcgdex, tcgcsv, pokemon-tcg (free); pokemon-price-tracker, poketrace, pricecharting (BYOK).
- Orchestrator (`jobs.ts`) persists to `card_prices` + `price_history`; provider health in `price_source_status`.

## Acceptance criteria
- [x] Each provider fetches live prices for a card.
- [x] Prices persisted with source attribution.

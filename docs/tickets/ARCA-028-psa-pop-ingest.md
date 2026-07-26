# ARCA-28 — Automated pop-report ingestion

**Status:** Planned · **Area:** PSA/Grading · **Depends on:** ARCA-16

## Context
Pop-report ingestion is a placeholder (`modules/etl/sources/psa-pop.ts` is a manual upsert; PSA has no official pop API).

## Scope
- Build a compliant pop-report ingestion source (scrape/import) feeding `pop_reports`.
- Schedule refresh; surface scarcity/pop trends in analytics + `PopReportChart`.

## Acceptance criteria
- [ ] Pop reports populate automatically and drive scarcity signals.

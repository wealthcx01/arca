# ARCA-37 — Wire the ETL framework & scheduling

**Status:** Planned · **Area:** Pricing/ETL · **Depends on:** ARCA-4

## Context
`modules/etl` (pipeline extract/transform/load + retry/backoff) and `ETL_SCHEDULES` exist but are not wired; jobs are registered but not auto-started.

## Scope
- Route ingestion jobs (pricing/FX/pop/news) through the ETL framework.
- Centralize scheduling; auto-start jobs with persisted run-state across restarts.

## Acceptance criteria
- [ ] Ingestion runs through the ETL framework on a managed schedule.
- [ ] Job state survives restarts.

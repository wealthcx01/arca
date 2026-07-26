# ARCA-16 — PSA cert verification

**Status:** Shipped · **Area:** PSA/Grading · **Depends on:** ARCA-2

## Context
Verify a PSA grading cert against the public API, cached.

## Scope
- `modules/psa`: `/verify/:cert` with 30-day + negative caching; 404/429 handling; `/status/:cert`.
- `graded_prices` + `pop_reports` tables; client grading panels.

## Acceptance criteria
- [x] A PSA cert number resolves to a verified grade, cached.

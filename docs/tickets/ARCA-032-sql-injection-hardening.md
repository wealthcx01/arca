# ARCA-32 — Parameterize raw SQL

**Status:** Planned · **Area:** Infra/Security · **Depends on:** ARCA-12

## Context
`market/handlers.ts` (movers, graded) and `analytics/handlers.ts` (screener) build `sql.raw` with interpolated `set`/`rarity`/numeric params, mitigated only by manual quote-escaping.

## Scope
- Replace interpolation with parameterized/bound queries throughout.
- Add a test that a crafted `set`/`rarity` value cannot alter the query.

## Acceptance criteria
- [ ] No user-influenced value reaches SQL via string interpolation.

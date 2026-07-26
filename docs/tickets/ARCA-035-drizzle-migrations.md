# ARCA-35 — Adopt real migrations

**Status:** Planned · **Area:** Platform · **Depends on:** ARCA-2

## Context
Schema is created by hand-written raw DDL in `db/push.ts` (with a one-off `ALTER TABLE`), separate from the Drizzle schema definitions — drift risk.

## Scope
- Move to `drizzle-kit` migrations as the single source of schema truth.
- Generate an initial migration from current state; retire raw-DDL push.

## Acceptance criteria
- [ ] Schema changes go through versioned migrations; `db/push.ts` DDL is retired.

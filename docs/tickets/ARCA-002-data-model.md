# ARCA-2 — SQLite + Drizzle data model

**Status:** Shipped · **Area:** Platform · **Depends on:** ARCA-1

## Context
The persistence layer: 22 tables on SQLite (`bun:sqlite`) with strict integer-money conventions.

## Scope
- Schema created by `db/push.ts` (raw DDL); Drizzle ORM types.
- Integer money: `_cents`, `_e6`, `_bp`, `_1pr`; 12-char nanoid ids.
- Seed path (`db/seed.ts`) + `db:push`/`db:seed` scripts.

## Acceptance criteria
- [x] `bun run db:push && bun run db:seed` produces a working DB.
- [x] All money handled as integers end to end.

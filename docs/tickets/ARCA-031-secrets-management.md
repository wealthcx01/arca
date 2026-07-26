# ARCA-31 — Remove committed secrets & manage keys

**Status:** Planned · **Area:** Infra/Security · **Depends on:** ARCA-3

## Context
The Pokemon TCG API key is hardcoded in `modules/cards/jobs.ts`, `db/seed.ts` and `.env.example`.

## Scope
- Move all provider keys to environment/secret storage; remove from source.
- Rotate the exposed Pokemon TCG key.
- Document required secrets in `.env.example` as names only.

## Acceptance criteria
- [ ] No API keys are committed; keys load from the environment.
- [ ] The exposed key is rotated.

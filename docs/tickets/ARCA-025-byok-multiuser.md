# ARCA-25 — Per-user BYOK pricing

**Status:** In progress · **Area:** Pricing/ETL · **Depends on:** ARCA-7

## Context
BYOK price fetching is stubbed to 'use the first active key' rather than running per-user.

## Scope
- Run BYOK providers per requesting user's active key.
- Scope BYOK-sourced prices/usage to the owning user where required.

## Acceptance criteria
- [ ] A user's BYOK sources use that user's key, not a global first key.

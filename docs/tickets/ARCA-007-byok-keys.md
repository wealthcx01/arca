# ARCA-7 — BYOK API-key management

**Status:** Shipped · **Area:** Pricing/ETL · **Depends on:** ARCA-4

## Context
Bring-your-own-key for paid price sources, encrypted at rest.

## Scope
- `/pricing/keys` CRUD; AES-256-GCM via `src/lib/crypto.ts` (`ARCA_ENCRYPTION_KEY`).
- BYOK providers run per active user key (decrypted at use).

## Acceptance criteria
- [x] Users add/remove provider keys; keys never stored in plaintext.

# ARCA-20 — Session authentication

**Status:** Shipped · **Area:** Auth · **Depends on:** ARCA-2

## Context
Email/password auth with server sessions.

## Scope
- `db/auth.ts` + `modules/auth`: bcrypt (`Bun.password`), `sessions` table, httpOnly `arca_session` cookie (30d).
- Middleware injects `X-User-Id`; client `useAuth` + `LoginPage`.

## Acceptance criteria
- [x] Signup/login/logout/me work; protected routes are user-scoped.

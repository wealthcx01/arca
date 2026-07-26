# ARCA-30 — Auth & access hardening

**Status:** Planned · **Area:** Auth · **Depends on:** ARCA-20

## Context
Security gaps: session cookie hardcoded `secure:false`; no rate limiting/CSRF/password-reset; `news` POST is unauthenticated; `better-auth` referenced but unused.

## Scope
- Environment-driven `secure`/SameSite cookies; rate-limit auth; add password reset + (optional) email verify.
- Gate write endpoints (e.g. news) behind auth/roles.
- Decide: adopt `better-auth` or formalize the custom auth (remove vestigial config).

## Acceptance criteria
- [ ] Cookies are secure in production; write endpoints require auth.
- [ ] No unauthenticated mutation paths remain.

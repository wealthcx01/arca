# ARCA-33 — Production deploy correctness

**Status:** Planned · **Area:** Infra/Deploy · **Depends on:** ARCA-1

## Context
The prod image can't serve the app as built: `server.ts` mounts only `/api/*` (no `client/dist` static serving); the Dockerfile copies `bun.lockb` but the repo ships `bun.lock` (so `--frozen-lockfile` fails).

## Scope
- Serve the built SPA (`client/dist`) from Hono, or split hosting explicitly.
- Fix the Dockerfile lockfile mismatch; make the image boot end-to-end.
- Environment-driven CORS/PORT; a documented one-command deploy.

## Acceptance criteria
- [ ] A built image serves both API and SPA and boots cleanly.
- [ ] `docker build` succeeds against the committed lockfile.

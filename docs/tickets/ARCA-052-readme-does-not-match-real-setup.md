# ARCA-52 — Root README doesn't match the real setup path; following it does not run the app

**Status:** Todo · **Area:** Docs/Setup · **Depends on:** —

## Why this matters (for the founder)
This is the very first thing anyone touching the repo reads. As written, following it produces
nothing runnable — no database, no client, no server on the expected ports. Anyone who trusts the
README over `CLAUDE.md` (a new contributor, a new machine, an external evaluator) is stuck before
they ever see the product.

## Context
Found during the ARCA-43 UI/UX audit, following the "clean state" setup path as instructed.

**What I did:** ran the two commands in the repo root `README.md` verbatim:
```
bun install
bun run index.ts
```

**What happened:** `bun install` succeeds, but there is no `index.ts` script that starts anything —
the README is the unmodified `bun init` stub (title "arca", generic install/run instructions). It
does not mention the database, the client, environment variables, or any of the seed scripts. It
never gets you to a running app.

**What actually works** (found only by reading `CLAUDE.md`, not the README):
```
bun install
cd client && bun install && cd ..
bun run db:push
bun run db:seed
bun run scripts/seed-prices.ts
bun run scripts/seed-analytics.ts
bun run dev
```
This starts the backend on :3001 and frontend on :5173 correctly.

**Expected:** the README documents the real setup path (or points to `CLAUDE.md`), so a new user or
contributor can go from a clean checkout to a running instance without prior knowledge of the
project.
**Actual:** the README is generic `bun init` boilerplate that doesn't reference the database,
seeding, or the dev script at all.

**Reproduce:** clone the repo fresh, read only `README.md`, follow its two commands.

## Scope
- Replace the root `README.md` with the real quick start (install, client install, `db:push`,
  `db:seed`, price/analytics seed scripts, `bun run dev`), matching what's already accurate in
  `CLAUDE.md`.
- Note expected ports (3001 backend, 5173 frontend) and that `.env` needs a Pokemon TCG API key for
  card seeding.

## Out of scope
- Restructuring `CLAUDE.md` itself — it's accurate, just not the file most people read first.
- Any change to the actual setup scripts (`db:push`, `db:seed`, etc.) — this is a documentation-only
  fix.

## Acceptance criteria
- [ ] A new contributor following only `README.md` from a clean checkout reaches a running instance
      (backend + frontend) without needing to read `CLAUDE.md` first.
- [ ] `README.md` no longer contains the unmodified `bun init` boilerplate text.

# ARCA-54 — Top-level README doesn't match the real setup path

**Status:** Planned · **Area:** Docs · **Depends on:** —

## Context
Filed from the ARCA-43 UI/UX audit's "get it running from a clean state, following the README" step,
per the ticket's explicit instruction to note anything in that path that doesn't work.

## What I did
Read `README.md` at the repo root before doing anything else, as a new contributor would.

## What happened
`README.md` is the unmodified `bun init` default:
```md
To install dependencies:
    bun install
To run:
    bun run index.ts
```
This does not start the app. There is no mention of:
- the separate `client/` frontend and its own `bun install`,
- `bun run db:push` / `bun run db:seed` (required before anything has data),
- `scripts/seed-prices.ts` / `scripts/seed-analytics.ts`,
- the `.env` file needed (`BETTER_AUTH_SECRET`, `POKEMON_TCG_API_KEY`, `ARCA_ENCRYPTION_KEY`, etc.),
- or `bun run dev`, which is the actual entry point (starts both backend on :3001 and frontend on
  :5173 via `concurrently`).

The real quick-start only exists in `CLAUDE.md` (an agent-instructions file, not a human-facing
README) and in `package.json`'s `scripts` block. A new human contributor following only
`README.md`, as instructed, would run `bun run index.ts` and get a one-line script with no server,
no database, and no indication anything is missing.

## What I expected
`README.md` to contain (or point to) the real setup steps: install root + client deps, `db:push`,
`db:seed`, the two extra seed scripts, required `.env` variables, and `bun run dev`.

## Repro steps
1. `cat README.md` at repo root.
2. Follow exactly what it says: `bun install && bun run index.ts`.
3. Observe this does not start a usable app (no server on :3001, no client on :5173, no seeded data).

## Acceptance criteria
- [ ] `README.md` accurately describes how to install, seed, and run the app end-to-end (or
      explicitly defers to a single canonical doc that does, linked from the README).

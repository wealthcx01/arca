# PRP — ARCA-052-readme-does-not-match-real-setup

## Intent
A new contributor who reads only the root `README.md` can go from a clean checkout to a running
ARCA instance (backend on :3001, frontend on :5173), with no need to discover `CLAUDE.md` first.

## Context
- `README.md` (repo root) is unmodified `bun init` boilerplate: title "arca", `bun install` +
  `bun run index.ts`. There is no `index.ts` start script — `index.ts` exists in the repo but does
  not boot the app — so following it verbatim produces nothing runnable.
- `CLAUDE.md` "Quick Start" already documents the real path and is confirmed accurate:
  `bun install` → `cd client && bun install && cd ..` → `bun run db:push` → `bun run db:seed` →
  `bun run scripts/seed-prices.ts` → `bun run scripts/seed-analytics.ts` → `bun run dev`.
- `package.json` scripts confirm these all exist: `dev` (runs `dev:server` on `PORT=3001` +
  `dev:client` on `--port 5173` via `concurrently`), `db:push`, `db:seed`. `scripts/seed-prices.ts`
  and `scripts/seed-analytics.ts` exist under `scripts/`.
- `.env.example` (repo root) lists required vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
  `POKEMON_TCG_API_KEY`, `ARCA_ENCRYPTION_KEY`, `PORT`. A `.env` already exists in this checkout,
  but neither `README.md` nor `CLAUDE.md`'s Quick Start currently tells a fresh clone to copy
  `.env.example` to `.env` first — the ticket calls out that `.env` needs a Pokemon TCG API key,
  so the new README should say so explicitly.
- Ticket ARCA-56 (seed-analytics.ts crashes in its summary step, separate ticket, Todo) means a
  fresh run of `seed-analytics.ts` may throw at the very end even on success — out of scope here,
  but worth a one-line heads-up in the README so it isn't mistaken for a broken setup step.
- Scope is documentation-only: rewrite `README.md`; do not touch `CLAUDE.md` or any setup script.

## Approach
Replace the entire contents of `README.md` with an accurate quick start mirroring `CLAUDE.md`'s
Quick Start section, in the correct order, plus the pieces `CLAUDE.md` doesn't spell out for a
first-time clone: copying `.env.example` to `.env` and setting `POKEMON_TCG_API_KEY`, and the
expected ports/URLs once running. One file touched: `README.md`.

## Tasks
- [ ] Remove the `bun init` boilerplate text and generic install/run instructions from `README.md`.
- [ ] Add a one-line project description consistent with `CLAUDE.md` ("The Bloomberg Terminal for
      Pokemon Cards").
- [ ] Add a prerequisite/env-setup step: copy `.env.example` to `.env` and set
      `POKEMON_TCG_API_KEY` (and note `BETTER_AUTH_SECRET`/`ARCA_ENCRYPTION_KEY` need real values).
- [ ] Add the full ordered setup sequence: `bun install`, `cd client && bun install && cd ..`,
      `bun run db:push`, `bun run db:seed`, `bun run scripts/seed-prices.ts`,
      `bun run scripts/seed-analytics.ts`, `bun run dev`.
- [ ] State the expected result: backend at `http://localhost:3001`, frontend at
      `http://localhost:5173`.
- [ ] Add a short note that `bun run scripts/seed-analytics.ts` takes several minutes and may print
      an error at the very end of an otherwise successful run (known issue, ARCA-56).
- [ ] Point to `CLAUDE.md` for architecture/module details, so the README stays a quick start and
      doesn't duplicate the fuller doc.

## Validation gates
- [ ] happy path: a reviewer running the exact command sequence in the new `README.md`, in order,
      on a clean checkout with `.env` populated, ends up with the backend responding on :3001 and
      the frontend reachable on :5173.
- [ ] edge cases: the README explicitly calls out the `.env` copy/API-key step, since skipping it
      is the most likely way a fresh clone silently fails at `db:seed` or the price/analytics seed
      scripts.
- [ ] errors: the README's note about `seed-analytics.ts`'s summary-step exception (ARCA-56) means
      a contributor seeing that error at the end of a run does not conclude setup failed.
- [ ] coverage: `README.md` contains zero remaining boilerplate strings from `bun init` ("This
      project was created using `bun init`", `bun run index.ts`), verifiable by grepping the file
      for `index.ts` and `bun init` and finding no matches.

<!-- foundry-ticket: b6a6b229ec3a6168 -->

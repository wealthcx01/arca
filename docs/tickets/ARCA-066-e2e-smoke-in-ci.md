# ARCA-66 — Run the browser smoke test in CI

**Status:** Todo · **Area:** Infra/QA · **Depends on:** ARCA-34

## Context
ARCA-34 shipped four gates — lint, typecheck, tests, build. Its fifth, the Playwright smoke test,
is **not** running, and this ticket is why rather than a tick nobody checked.

`client/playwright.config.ts` points at `scripts/*.pw.ts` with `baseURL: http://localhost:5173`, and
the one test there (`cards-set-name.pw.ts`, from ARCA-50) needs more than a browser:

- the backend on `:3001` and the Vite dev server on `:5173`,
- a working sign-up flow — it registers a fresh account per run,
- **and a catalog with cards in it**, since it asserts a set name is visible on a card page.

That last one is the real obstacle. The unit tests solved it by bringing their own two cards and
deleting them afterwards; a browser test cannot, because it drives the real UI, which paginates and
filters a catalog it expects to be populated.

Seeding it the normal way (`bun run db:seed`) calls the Pokémon TCG API. A gate that fails when
someone else's service is slow is not a gate — the same reason ARCA-34's test job does not call it.

## Scope
- **A committed catalog fixture** — a small, fixed set of cards (tens, not thousands) loadable
  offline, so the smoke test has a known catalog and known cards to assert against.
- A CI job that: creates the schema, loads the fixture, starts the backend and the client, waits for
  both to answer, runs the smoke test, and uploads screenshots on failure.
- Bounded like every other job (`timeout-minutes`), and the browser install cached and bounded —
  the studio's own UI gate hung for six hours on exactly that step.

## Explicitly NOT here
- Growing the browser suite. One honest smoke test that runs is worth more than ten that do not.
- Testing against a live external pricing source.

## Acceptance criteria
- [ ] The smoke test runs on every PR, against a catalog fixture, with no external network call.
- [ ] It fails when the set name is missing from the card pages — verified by removing it once.
- [ ] Screenshots are uploaded when it fails, so a red run can be read without reproducing it.
- [ ] ARCA-34's fifth criterion can then be ticked honestly.

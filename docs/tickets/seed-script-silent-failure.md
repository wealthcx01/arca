# ARCA-NEW — Seed script must fail loudly on zero cards seeded

**Status:** In progress · **Area:** Cards/Setup · **Depends on:** —

## Why this matters (for the founder)
Right now a broken seed run tells you it worked. A new developer or a new user can end up with a completely empty app and no signal that anything went wrong — that's a trust-breaking first impression and a support nightmare.

## Context
Founder ran product setup from scratch today; the seed script printed "🎉 Seeded 0 cards" and exited with a success code. Related backlog item ARCA-24 (Market-wide price coverage & full catalog) already flags that the catalog seed is capped and undercounts the full corpus — but this ticket is specifically about the *zero-cards, silent-success* failure mode, which is a more basic correctness/trust bug than coverage size.

## Scope
- Seed script checks how many cards were actually inserted before declaring success.
- If zero cards were seeded (or the count is far below any expected minimum), the script exits with a non-zero/failure code and prints a clear error, not a celebratory success message.
- Error message tells the person what likely went wrong (e.g. network/API failure, bad config) and what to check next.

## Out of scope
- Fixing the underlying cap on catalog size (that's ARCA-24).
- Retry/auto-recovery logic — this ticket is just "detect and fail honestly," not "self-heal."

## Acceptance criteria
- [x] Running the seed script in a state where zero cards are seeded results in a non-zero exit code.
- [x] The console output clearly states the seed failed and why, instead of "🎉 Seeded 0 cards."
- [x] A normal successful seed (cards > 0) still exits cleanly with its existing success message.

## Manual verification

`db/seed.ts` has no automated test harness (unlike `src/lib/*.test.ts`) and hits the live Pokemon TCG
API, so this was verified by running `bun run db:seed` end-to-end against the real API and checking
`echo $?` after each run. The live API happened to be flaky during testing (intermittent 500/502s),
which incidentally produced a genuine (not simulated) zero-card failure on the first run.

**Zero-card failure scenario** — page 1 fetch hit a real `500 Internal Server Error` from the API:
```
$ bun run db:seed
🌱 Seeding card database from Pokemon TCG API...
📥 Fetching page 1/5...
   ❌ Page 1 failed: API error: 500 Internal Server Error

❌ Seed failed: only 0 cards were seeded (expected > 100).
   Likely cause: network failure or an invalid/expired Pokemon TCG API key.
   Check: your network connection, and the API_KEY in db/seed.ts against https://api.pokemontcg.io/v2.
error: script "db:seed" exited with code 1
EXIT_CODE:1
```
No `🎉` message printed. Confirmed via `echo $?` → `1`.

**Normal success scenario** — retried once the API recovered, pages 1–2 succeeded before a later page
hit a transient `502`, which the existing per-page `break` handles by summarizing what was actually seeded:
```
$ bun run db:seed
🌱 Seeding card database from Pokemon TCG API...
📥 Fetching page 1/5...
   ✅ 250 cards (250 total)
📥 Fetching page 2/5...
   ✅ 250 cards (500 total)
📥 Fetching page 3/5...
   ❌ Page 3 failed: API error: 502 Bad Gateway

🎉 Seeded 500 cards into database
📊 Database: 502 cards across 87 sets
EXIT_CODE:0
```
Confirmed via `echo $?` → `0`.

Threshold rationale: `MIN_EXPECTED_CARDS = 100` (see `db/seed.ts`) — a single successful page returns
up to 250 cards, so any real-but-partial seed clears the floor comfortably, while a run that only ever
fails before inserting anything (or inserts a token handful) is correctly classified as a failure.

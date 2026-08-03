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
- [ ] Running the seed script in a state where zero cards are seeded results in a non-zero exit code.
- [ ] The console output clearly states the seed failed and why, instead of "🎉 Seeded 0 cards."
- [ ] A normal successful seed (cards > 0) still exits cleanly with its existing success message.

## Manual verification (no automated test harness exists for `db/seed.ts`; it hits a live external API)

Both scenarios below were run end-to-end and their exit codes checked with `echo $?`.

**Failure scenario (real, not simulated):** the live Pokemon TCG API happened to be returning
`500 Internal Server Error` at verification time (confirmed independently with a direct `curl` to
`https://api.pokemontcg.io/v2/cards`, so this was a genuine upstream failure, not a sandbox network
block). Running `bun run db:seed` against it printed `❌ Page 1 failed: API error: 500 Internal
Server Error`, then `❌ Seed failed: only 0 cards were seeded (expected at least 100)` with the
network/API-key/outage guidance and a re-run instruction, printed no `🎉` line, and exited with code
`1` (`echo $?` → `1`).

**Success scenario:** since the live API was down, the happy path was verified against a local mock
HTTP server (`bun.serve` on `localhost`) that returns a page of 250 well-formed cards followed by an
empty page, matching the real API's response shape. Pointing a temporary copy of `db/seed.ts` at the
mock (`BASE_URL` swapped to the local server) and running it printed `✅ 250 cards (250 total)` then
`🎉 Seeded 250 cards into database` plus the set/card stats, and exited with code `0` (`echo $?` →
`0`). The temporary script copy, mock server, and the 250 mock rows it inserted were all removed
afterward — the working tree and `data/arca.db` are unchanged by this verification.

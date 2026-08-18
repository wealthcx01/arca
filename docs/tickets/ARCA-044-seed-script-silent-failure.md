# ARCA-44 — Seed script must fail loudly on zero cards seeded

**Status:** Todo · **Area:** Cards/Setup · **Depends on:** —

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

# PRP — ARCA-044-seed-script-silent-failure

## Intent
When the card seed run inserts zero (or near-zero) cards, the founder sees a clear failure with a non-zero exit code and a reason — never a "🎉 Seeded 0 cards" success message masking a broken setup.

## Context
- The seed script is `db/seed.ts` (run via `bun run db:seed`), not `scripts/seed-prices.ts` or `scripts/seed-analytics.ts` — those are downstream and depend on cards already existing.
- `db/seed.ts` fetches up to 5 pages (`maxPages = 5`, ~1250 cards) from the Pokemon TCG API, upserts into `cards`, and always ends with `console.log(\`\n🎉 Seeded ${totalCards} cards into database\`)` regardless of `totalCards` — this is the silent-success bug the founder hit.
- Its per-page fetch failure handling (`catch (err) { console.error(...); break; }`) swallows the error and falls through to the same celebratory summary — a full API outage on page 1 still prints success.
- The final line is `seed().catch(console.error)` — even an unhandled rejection only logs; the process still exits 0.
- `scripts/seed-prices.ts` already solved this exact problem for its own pipeline: after fetching, it checks `if (prices.length === 0) { console.log("No prices fetched. Check your network connection."); process.exit(1); }`, and its `main().catch((err) => { console.error("Seed failed:", err); process.exit(1); })` ensures unhandled errors exit non-zero too. This is the pattern to mirror for consistency across the two seed scripts.
- ARCA-24 (market-wide catalog coverage / the 5-page cap) and ARCA-48 (real vs. synthetic price history) are explicitly out of scope — this ticket only concerns the zero-cards-exits-0 failure mode, not catalog completeness.

## Approach
Smallest correct change, entirely inside `db/seed.ts`:
1. After the fetch loop, if `totalCards === 0`, print a clear failure message (state that nothing was seeded and point at likely causes — network/API failure, bad/missing API key, TCG API outage) and `process.exit(1)` instead of the celebratory log line.
2. Keep the existing success path (`🎉 Seeded N cards...` + stats) unchanged for `totalCards > 0`.
3. Change `seed().catch(console.error)` to also `process.exit(1)` on unhandled rejection, matching `scripts/seed-prices.ts`'s `main().catch(...)` pattern, so a thrown error can't silently exit 0.

No new files, no changes to `scripts/seed-prices.ts` or `scripts/seed-analytics.ts`, no retry logic, no change to the `maxPages` cap.

## Tasks
- [ ] Add a post-loop check in `db/seed.ts`: when `totalCards === 0`, log a clear failure message naming likely causes and call `process.exit(1)` before reaching the success log line.
- [ ] Leave the existing success log (`🎉 Seeded ${totalCards} cards...` + stats query) as the only output path when `totalCards > 0`.
- [ ] Update `seed().catch(console.error)` to also exit non-zero (mirroring `scripts/seed-prices.ts`'s `main().catch((err) => { console.error(...); process.exit(1); })`).

## Validation gates
- [ ] happy path: running `bun run db:seed` against a working Pokemon TCG API and valid key inserts cards > 0, still prints the existing `🎉 Seeded ${totalCards} cards into database` message and stats, and the process exits 0.
- [ ] edge cases: if the API returns a valid but empty response on page 1 (`response.data.length === 0`, loop breaks immediately with `totalCards === 0`), the script prints the new failure message and exits non-zero — not the success message.
- [ ] errors: if `fetchPage` throws (e.g. network failure, non-2xx from the API, bad API key) on page 1 causing the catch-and-break to leave `totalCards === 0`, the script exits non-zero with a message that distinguishes this from the plain zero-results case; an unhandled rejection from `seed()` itself also exits non-zero via the updated `.catch`.
- [ ] coverage: manually verify both branches by running `bun run db/seed.ts` once against a deliberately broken `BASE_URL`/`API_KEY` (expect non-zero exit + failure message) and once unmodified against the real API (expect exit 0 + existing success message and count).

<!-- foundry-ticket: 4f701eb5b41e0f23 -->

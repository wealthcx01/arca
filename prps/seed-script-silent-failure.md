# PRP — seed-script-silent-failure

## Intent
When the card seed run inserts zero (or near-zero) cards, `bun run db:seed` exits with a failure code and prints a clear "seed failed, here's likely why" message instead of a celebratory success line — so a broken setup is impossible to miss.

## Context
- The bug lives in `db/seed.ts`. Its `seed()` function (lines 70–123) loops over up to 5 API pages, counts `totalCards`, and unconditionally prints `🎉 Seeded ${totalCards} cards into database` (line 115) regardless of whether `totalCards` is 0. Per-page fetch errors are caught inside the loop (line 109–112) and just `break`, falling through to the same "success" summary.
- `seed().catch(console.error)` (line 125) is the entrypoint — `console.error` does not set a non-zero exit code, and there is no `process.exit(1)` anywhere in the file, so Bun exits 0 even on a thrown error or a zero-card run.
- This exact fix pattern already exists elsewhere in the repo: `scripts/seed-prices.ts` (lines 435–438) checks `if (prices.length === 0) { console.log("No prices fetched. Check your network connection."); process.exit(1); }`, and its `main().catch((err) => { console.error("Seed failed:", err); process.exit(1); })` (lines 472–475) is the established "fail loud" idiom for seed scripts in this codebase. Follow this same shape for consistency rather than inventing a new one.
- Ticket ARCA-24 (full-catalog coverage) is explicitly out of scope — this ticket is only about the zero/near-zero silent-success case, not the existing `maxPages = 5` (~1250 card) cap.
- No retry/auto-recovery is in scope — detect and fail honestly only.

## Approach
Smallest correct change, entirely inside `db/seed.ts`:
1. After the fetch loop, check `totalCards` against a minimum threshold (0, or a small sane floor — e.g. treat anything under a couple hundred as suspicious given the 5-page/250-per-page design) before printing the success banner.
2. If the count is at/under the threshold, print an error explaining likely causes (network failure, bad/expired API key, Pokemon TCG API downtime — tie the message to what `fetchPage`'s thrown errors actually report) and what to check next, then `process.exit(1)` instead of falling through to the `🎉` line.
3. Replace `seed().catch(console.error)` with the `seed-prices.ts`-style pattern: catch, log clearly, `process.exit(1)`.
4. Leave the successful path (cards > threshold) printing its existing `🎉 Seeded N cards` + stats output unchanged.

Files touched: `db/seed.ts` only.

## Tasks
- [ ] Add a post-loop check in `seed()` that treats `totalCards` at/under the failure threshold as a failed run.
- [ ] Replace the unconditional `🎉 Seeded ${totalCards} cards` message with a branch: success banner when above threshold, clear failure message (with likely cause + next step) when at/below it.
- [ ] Make the failure path exit non-zero (`process.exit(1)`), matching the `seed-prices.ts` idiom.
- [ ] Update `seed().catch(console.error)` to log clearly and `process.exit(1)` on any uncaught/thrown error, not just the zero-card case.
- [ ] Verify the existing per-page error `break` (line 109–112) now correctly flows into the new failure branch when it leaves `totalCards` at/near 0.

## Validation gates
- [ ] happy path: running `bun run db:seed` against a working API key/network seeds cards > threshold, prints the existing `🎉 Seeded N cards` + set/card stats, and exits 0 (`echo $?` after the run shows `0`).
- [ ] edge cases: a run that seeds a nonzero but suspiciously low card count (e.g. API returns data on page 1 only, then empty) is still classified correctly — confirm the chosen threshold and document why it was picked (0 vs. a small floor) so a partial-but-real seed isn't mistaken for a failure.
- [ ] errors: simulating zero cards seeded (e.g. invalid API key or network unreachable so `fetchPage` throws on page 1) results in a non-zero exit code and console output that names the failure and a concrete next step (e.g. "check your network connection or API key"), with no `🎉` message printed.
- [ ] coverage: manually run both the zero-card failure scenario and the normal success scenario end-to-end and confirm exit codes with `echo $?`, since `db/seed.ts` has no existing automated test harness (unlike `src/lib/*.test.ts`) and hits a live external API — note this manual verification in the PR description in lieu of an automated test.

<!-- foundry-ticket: d5a6ba52f905c5b9 -->

<!-- foundry-ticket: d5a6ba52f905c5b9 -->

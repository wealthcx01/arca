# PRP — sign-in-tagline-fix

## Intent
The founder gets a sign-in page that no longer borrows Bloomberg's and Pokémon's trademarks (and no longer misspells "Pokémon") — the first external-facing screen stops carrying legal exposure and starts giving ARCA its own voice.

## Context
- The offending copy lives in exactly one place: `client/src/pages/LoginPage.tsx:37`, `<p>The Bloomberg Terminal for Pokemon Cards</p>`, directly under the "ARCA" `<h1>` at line 35.
- Checked every other user-visible surface for the same phrase: `client/index.html` `<title>` is already just `ARCA` (no Bloomberg/Pokemon, no meta description/og tags present at all); no splash/loading screen component exists that renders it; a repo-wide grep of `client/src/**` for "Bloomberg" returns only `LoginPage.tsx:37` and an internal, non-user-facing CSS comment (`client/src/index.css:7`, "Professional dark terminal feel — like LSEG Eikon/Bloomberg.") which the ticket's scope explicitly excludes (internal docs/code). So the fix is single-file.
- Per the ticket, the replacement copy must come from ARCA's positioning/brand work, not be invented for this ticket. I checked for a settled tagline: `docs/tickets/` has no positioning doc, `git log --all` has no merged positioning work, and the one relevant attempt directory (`SELL-001-positioning-one-pager`, three prior run folders under `/opt/foundry/lane/state/runs/`) produced no merged commit or landed artifact in this repo — none of those runs' `prp.md`/`impl.log` output reached `docs/` or `client/`. **No approved positioning tagline exists yet.**
- Per the ticket's own instruction, that means: stop and check with the founder rather than guess a replacement line — do not ship invented copy as final.
- Venture knowledge confirms: Bloomberg's ToS actively prohibits unaffiliated use of "BLOOMBERG TERMINAL"; "Pokémon" is a Nintendo/Game Freak/Creatures trademark; product policy elsewhere in this repo (`context: Product policy: never show fake/demo data`) reinforces a house norm against inventing content to fill a gap, which extends naturally to inventing marketing copy.

## Approach
Smallest correct change: delete the trademarked line from `LoginPage.tsx` now (that part is unconditionally correct and time-sensitive), and do not invent replacement copy in its place — leave the "ARCA" wordmark standing alone until a founder-approved tagline exists, rather than shipping a placeholder that the ticket explicitly forbids. Surface the missing-tagline gap to the founder as an explicit open question rather than silently resolving it.

Files touched:
- `client/src/pages/LoginPage.tsx` — remove the `<p>` at line 37 (and its Bloomberg/Pokemon text) from under the `<h1>ARCA</h1>`; no other line in this file references the phrase.

No other files require changes — `client/index.html` and every other `client/src/**` file are already clean of the phrase in user-visible copy.

## Tasks
- [ ] Remove the `<p>The Bloomberg Terminal for Pokemon Cards</p>` line from `client/src/pages/LoginPage.tsx`, leaving the `ARCA` heading intact with no invented replacement tagline
- [ ] Re-verify `client/index.html` title and every `client/src/**` file for any remaining user-visible "Bloomberg" / "Pokemon" / "Pokémon" occurrence after the edit
- [ ] Confirm the internal-only CSS comment in `client/src/index.css:7` is left untouched (out of scope, not user-visible)
- [ ] Flag explicitly to the founder, before this ships, that no positioning-approved tagline exists yet and ask what (if anything) should appear under "ARCA" on the sign-in page — do not resolve this by guessing copy

## Validation gates
- [ ] happy path: loading the sign-in page renders only "ARCA" with no Bloomberg or Pokemon/Pokémon text anywhere on screen, and the page still renders/functions (sign-in and sign-up forms unaffected) after the line is removed
- [ ] edge cases: both the sign-in and sign-up view of `LoginPage.tsx` (toggled via `isSignup` state) are checked, since the removed `<p>` sits above the form and is shared by both views
- [ ] errors: a repo-wide grep of `client/src/**` and `client/index.html` for "Bloomberg" and "Pokemon"/"Pokémon" (case-insensitive) turns up zero user-visible matches (the `index.css` internal comment is the only allowed remaining hit, and only because it's non-user-facing)
- [ ] coverage: acceptance criterion "no placeholder copy goes live as final" is met by inspection — the diff contains a deletion with no new tagline string introduced, and the founder-confirmation question has been raised, not silently skipped

<!-- foundry-ticket: ff3284c18fed6b2d -->

<!-- foundry-ticket: ff3284c18fed6b2d -->

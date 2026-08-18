# ARCA-47 — Replace Bloomberg/Pokemon tagline on sign-in page

**Status:** Todo · **Area:** Client/UI · **Depends on:** —

## Why this matters (for the founder)
The sign-in page — the first thing anyone outside the company sees — currently says "The Bloomberg Terminal for Pokemon Cards." That borrows two trademarks we don't own to make our pitch, and misspells Pokémon. Fixing it protects us before anyone external sees the product and gives ARCA its own voice from the first screen.

## Context
- Bloomberg's own Terms of Service explicitly prohibit using "BLOOMBERG TERMINAL" or its other marks in any way that implies affiliation or endorsement — it's an actively asserted trademark, not a generic term (data.bloomberg.com/tos, bloomberg.com/notices/tos).
- "Pokémon" is a registered trademark of Nintendo/Game Freak/Creatures Inc.; the current copy also misspells it ("Pokemon", missing the é accent).
- This phrase is used informally as shorthand inside project docs/code today (not just the sign-in page), but this ticket is scoped only to the public-facing sign-in screen — the highest-risk, most visible spot. Internal doc/code references are a separate, lower-priority cleanup.
- **No replacement tagline should be invented on the spot for this ticket.** The final wording must come out of ARCA's positioning/brand work — i.e. whatever language the founder has settled on (or settles on) for how ARCA describes itself independent of Bloomberg/Pokémon comparisons. If that positioning work has not yet produced a settled line by the time this is picked up, the builder should stop and check with the founder rather than guess — do not ship a placeholder as final copy.

## Scope
- Remove "The Bloomberg Terminal for Pokemon Cards" (and any misspelled "Pokemon" in that same line) from the sign-in page.
- Replace it with the tagline sourced from ARCA's positioning work (see Context) — not a phrase invented during this build.
- Check for and fix the same trademarked/misspelled phrase anywhere else it's visibly shown to end users (e.g. browser tab title, loading screen) — internal docs/code excluded.
- Confirm final wording with the founder before this ships if positioning work has not already produced an approved line.

## Out of scope
- Doing the positioning/brand work itself (naming, tagline creation) — that is a separate workstream this ticket depends on for its final copy.
- Renaming the project internally or in code/docs (e.g. ticket titles, architecture notes) — that shorthand stays for now.
- Any other rebrand, logo, or visual design changes beyond this one line of copy.
- Legal review/trademark filing for ARCA's own name — not part of this ticket.

## Acceptance criteria
- [ ] Sign-in page no longer contains "Bloomberg" or "Pokemon"/"Pokémon" in its tagline or headline copy.
- [ ] The replacement tagline is the one sourced from ARCA's positioning work, not invented ad hoc for this ticket.
- [ ] If no positioning-approved tagline exists yet, the builder has checked with the founder before shipping — no placeholder copy goes live as final.
- [ ] Any other user-visible spot with the same old phrase (tab title, loading screen, etc.) is also updated.
- [ ] No demo/invented data or claims introduced as part of the copy change.

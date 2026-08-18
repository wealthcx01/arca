# PRP — ARCA-047-sign-in-tagline-fix

## Intent
The founder gets a sign-in page that no longer borrows Bloomberg's and Pokémon's trademarks (and no longer misspells "Pokémon") — the first external-facing screen speaks in ARCA's own voice, or the founder is asked for that voice before anything ships.

## Context
- The offending copy lives in exactly one place: `client/src/pages/LoginPage.tsx:37`, inside the centered header block (lines 34-39), directly under the `<h1>ARCA</h1>` at line 35:
  ```jsx
  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
    The Bloomberg Terminal for Pokemon Cards
  </p>
  ```
- Verified by direct search: `client/index.html` (browser tab title) only contains `<title>ARCA</title>` — already clean, no change needed there. No splash/loading screen component exists in `client/src`.
- No test files under `client/src/**` reference this tagline text, so no test updates are needed.
- The phrase also appears in `CLAUDE.md`, `package.json` (description field), and `docs/analytics-*.md` — all internal, non-user-facing, and explicitly out of scope per the ticket.
- Per the ticket (`docs/tickets/ARCA-047-sign-in-tagline-fix.md`): no replacement tagline exists yet from ARCA's positioning/brand work, and none is recorded anywhere in the repo (`docs/`, memory, or elsewhere). The ticket is explicit that a placeholder must not ship as final copy — the builder must stop and confirm wording with the founder if positioning work hasn't produced a settled line.
- This is a single-line JSX text change in a React 19 + Vite client (`client/src/pages/LoginPage.tsx`), following the existing Tailwind class conventions already used on that line — no other structural change needed.

## Approach
The smallest correct change is to swap the text content of the `<p>` at `client/src/pages/LoginPage.tsx:37` for the founder-approved tagline, once obtained — no JSX structure, classes, or other files need to change. Since no approved tagline exists in the repo or venture knowledge, the concrete next step before touching code is to ask the founder for the replacement line (or confirmation that none exists yet), rather than inventing one.

Files touched:
- `client/src/pages/LoginPage.tsx` (line 37 only)

## Tasks
- [ ] Ask the founder for the approved ARCA positioning tagline (or confirmation that positioning work isn't settled yet) before writing any replacement copy
- [ ] Replace the text of the `<p>` at `client/src/pages/LoginPage.tsx:37` with the founder-approved tagline, correctly spelled and free of "Bloomberg"/"Pokemon"/"Pokémon"
- [ ] Re-scan `client/src/**` and `client/index.html` for any other visible occurrence of "Bloomberg" or "Pokemon"/"Pokémon" that may have been missed, and fix if found
- [ ] Visually confirm the sign-in page renders correctly with the new copy (spacing/wrapping under the ARCA heading)

## Validation gates
- [ ] happy path: `client/src/pages/LoginPage.tsx` no longer contains the strings "Bloomberg" or "Pokemon"/"Pokémon" anywhere, and the sign-in page displays the founder-approved tagline in place of the old line
- [ ] edge cases: the new tagline fits the existing `<p>` styling (`text-sm`, centered, `max-w-sm` container) without visual overflow or awkward wrapping at common viewport widths
- [ ] errors: if no founder-approved tagline is available when this is picked up, no placeholder or invented copy is committed — work stops and the founder is asked, per the ticket's explicit instruction
- [ ] coverage: a full-repo search for "Bloomberg" and "Pokemon" (excluding docs/tickets, CLAUDE.md, package.json, and other internal-only files) turns up zero remaining user-visible matches, confirming `client/index.html` and the rest of `client/src` are already clean and no new occurrence was missed

<!-- foundry-ticket: ff574a674caef1c7 -->

<!-- foundry-ticket: ff574a674caef1c7 -->

<!-- foundry-ticket: ff574a674caef1c7 -->

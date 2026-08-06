# ARCA-53 — "Market Intel — By Era" values are clipped at 1024 and 1280px, not just narrow widths

**Status:** Planned · **Area:** Frontend/UX · **Depends on:** ARCA-17

## Context
Filed from the ARCA-43 UI/UX audit's three-widths pass — flagged separately from the 375px findings
because the ticket specifically calls out checking the common laptop width (1024/1280), not only the
extremes.

## What I did
Visited `/overview` at 1280px and 1024px and inspected the "Market Intel — By Era" panel (bottom-right
of the Overview grid).

## What happened
At both 1280 and 1024px, the rightmost "VALUE" column's dollar figures touch or run past the panel's
right edge/border ($7675, $4187, $403, $155, $7773) — visible in the captured screenshots at both
widths. It's not a hard clip (the digits are legible in the screenshot), but the values sit flush
against or slightly over the panel boundary with no padding, which reads as a layout bug rather than
intentional design, especially since neighboring columns (ERA, SETS, AVG) all have normal padding.

## What I expected
Consistent right-padding/margin on the VALUE column matching the other columns in the same table.

## Repro steps
1. Sign in, set viewport to 1280px, then 1024px.
2. Visit `/overview`, look at "Market Intel — By Era" (bottom-right panel).
3. Observe the VALUE column figures crowding/touching the panel's right edge at both widths.

## Acceptance criteria
- [ ] The VALUE column in "Market Intel — By Era" has consistent right-padding at 1024 and 1280px,
      matching the other columns.

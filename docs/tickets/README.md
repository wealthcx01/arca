# ARCA tickets

Work items for ARCA, one file per ticket, in the format the Foundry Studio parses
(`# ARCA-N — Title`, a `**Status:**` field, `**Depends on:**` ids). This seeds the
studio's lanes/tickets view for the ARCA dogfood.

- **Status** maps to a lane column: `Shipped` → done, `In progress` → in-progress,
  `Planned` → todo. Shipped tickets are reverse-engineered from the existing code so the
  history is visible; present/future tickets are the live queue.
- Convention going forward: **one ticket = one branch = one PR**; never self-merge.

Backlog authored from the codebase + design docs (`reference/TRKD-to-ARCA-Design.md`,
`docs/analytics-implementation.md`, `docs/analytics-continuation-prompt.md`).

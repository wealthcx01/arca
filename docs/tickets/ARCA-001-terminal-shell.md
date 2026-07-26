# ARCA-1 — Terminal shell & UI primitives

**Status:** Shipped · **Area:** Platform · **Depends on:** —

## Context
The dense, dark 'Bloomberg-for-cards' shell modelled on an LSEG/Refinitiv terminal (reference/TRKD-to-ARCA-Design.md).

## Scope
- Hono 4 on Bun backend (`server.ts`) + React 19 / Vite / Tailwind v4 client.
- Diamond (dark) / Pearl (light) themes; `Layout.tsx` nav (12 tabs).
- Terminal primitives: `DataPanel`, sortable `DataTable`, `PriceCell`, `QuoteBox`, `RollingTicker`.

## Acceptance criteria
- [x] Full-stack app boots via `init.sh` / `bun run dev`.
- [x] Terminal aesthetic and primitives reused across pages.

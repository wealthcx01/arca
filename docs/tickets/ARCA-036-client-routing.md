# ARCA-36 — Modernize client routing

**Status:** Planned · **Area:** Client/UI · **Depends on:** ARCA-21

## Context
Routing is hand-rolled on `window.location.pathname` with full-page reloads; `@tanstack/react-router`, `@tanstack/react-query` and `react-router` are installed but unused.

## Scope
- Adopt the installed router + query libs; client-side transitions.
- Deep-linkable card-detail/analytics state; remove hard redirects/reloads.

## Acceptance criteria
- [ ] Navigation is client-side with no full reloads; views are deep-linkable.

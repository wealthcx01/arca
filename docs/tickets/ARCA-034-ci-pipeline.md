# ARCA-34 — CI pipeline

**Status:** Planned · **Area:** Infra/QA · **Depends on:** ARCA-22

## Context
There is no CI (`.github/workflows` absent); tests run only locally.

## Scope
- GitHub Actions: install, lint (biome), typecheck, unit tests, Playwright smoke.
- Block merges on red; mirror the studio's PR-gated flow.

## Acceptance criteria
- [ ] Every PR runs lint + typecheck + tests + smoke automatically.

# ARCA-42 — Analytics / API / provider tests

**Status:** Planned · **Area:** Infra/QA · **Depends on:** ARCA-22

## Context
Only pure-math + the holdings engine are tested; handlers, analytics and providers are untested, and there are no e2e tests for the analytics pages.

## Scope
- Handler/API tests for pricing, analytics, portfolio, performance, market.
- Provider contract tests (mocked); e2e for analytics/card-detail pages.

## Acceptance criteria
- [ ] Handlers, analytics and providers have automated coverage.
- [ ] Analytics pages have e2e tests.

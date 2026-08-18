# ARCA-46 — Overview page welcome & empty states

**Status:** In progress · **Area:** Onboarding / Overview page · **Depends on:** —

## Why this matters (for the founder)
The Overview page is the first screen a new user sees after signing up, and right now it's nine blank panels with no guidance — the worst possible first impression for a market terminal. Fixing this turns a confusing dead-end into a clear, trustworthy welcome.

## Context
- The Overview page (post-signup landing) currently shows nine panels — set data, gainers, losers, FX, graded prices, cards, coverage, etc. — all empty, with nothing telling a new person what to do first.
- A "Welcome to ARCA" state already exists and works, but it's built on the Portfolio page, which new users are never sent to.
- Founder decision (saved to venture knowledge): ARCA never shows fake/demo data to fill empty states — as a market-analytics terminal, invented numbers would undermine trust in every real number shown afterward. Every empty panel must instead show a genuine empty state with one clear next action.

## Scope
- Move the existing "Welcome to ARCA" state from the Portfolio page to the Overview page, so it's the first thing a new user sees.
- Replace each of the nine empty Overview panels with a real empty state that:
  - Plainly states what the panel is for and what data would normally fill it (e.g. "Top gainers will appear here once graded price data is available for your tracked sets").
  - Gives one clear, single next action relevant to that panel (e.g. "Add your first card," "Set your base currency," "Browse the catalog").
- Ensure the welcome state and the panel empty states work together as one coherent first-run screen, not as separate, conflicting messages.

## Out of scope
- Any use of sample, demo, or placeholder data/numbers in panels — explicitly disallowed by policy.
- Redesigning the Portfolio page itself (only the welcome state is being relocated).
- Building the underlying data pipelines/features that would eventually fill each panel (gainers, FX, coverage, etc.) — this ticket only covers what the user sees while that data doesn't yet exist for them.
- Any onboarding flow changes before signup (this is post-signup only).

## Acceptance criteria
- [ ] A brand-new user, immediately after signup, lands on the Overview page and sees the "Welcome to ARCA" state there (not on Portfolio).
- [ ] All nine Overview panels, when they have no real data for that user, show a genuine empty state — no invented numbers anywhere.
- [ ] Each empty panel clearly states what it's for and what would fill it.
- [ ] Each empty panel offers exactly one clear next action.
- [ ] The Portfolio page no longer shows the welcome state (it now only appears on Overview).

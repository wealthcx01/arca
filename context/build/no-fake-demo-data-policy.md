# Product policy: never show fake/demo data in empty states

## Decision
ARCA never fills empty panels, charts, or lists with sample/demo/placeholder numbers to make the UI "feel alive." As a market-analytics terminal, invented data would be the worst possible first impression and undermines trust in every real number shown later.

## What to do instead
When there's no real data yet (new account, no cards added, no watchlist, no portfolio holdings), show a genuine empty state:
- Plainly state what the panel is for and what would normally appear there.
- Give one clear next action (e.g. "Add your first card", "Set your base currency").

## Where this applies
Applies venture-wide to any panel/page that can be empty for a new or low-activity user — not just the Overview page. Treat this as the default pattern for all future empty states.

## Related
Welcome/onboarding state belongs on the Overview page (the first screen after signup), not the Portfolio page.


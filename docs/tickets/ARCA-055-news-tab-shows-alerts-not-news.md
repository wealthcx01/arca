# ARCA-55 — "News" nav tab shows price alerts and a hardcoded calendar, not news

**Status:** Todo · **Area:** Client/UI · **Depends on:** —

## Why this matters (for the founder)
News is one of the twelve primary nav destinations. A collector clicking it expects articles or
market commentary. What they get is a price-alerts table (a feature that already exists elsewhere
in spirit) and a calendar of set releases with hardcoded dates — nothing that a reasonable person
would call "news." Meanwhile there's a fully-built news CRUD API and database table that nothing in
the UI ever calls.

## Context
Found during the ARCA-43 UI/UX audit. Steps taken: signed in, clicked "News" in the nav bar.

**What happened:** the page (`client/src/pages/MarketNewsPage.tsx`) renders a panel titled "Price
Alerts" (a >5% price-movement table, empty for this fresh account: "No significant price movements
found") and a sidebar "Release Calendar" whose four entries are hardcoded in the component itself
(`client/src/pages/MarketNewsPage.tsx:97-102`, comment: `// Release calendar placeholder`) rather
than sourced from any API. Nothing on the page is news in the ordinary sense (headlines, articles,
market commentary).

Checked the backend: `modules/news/handlers.ts` implements a real `/api/news` CRUD route reading
from a `market_news` table, per the module list in `CLAUDE.md` ("news: Market news CRUD"). Grepped
the entire client for any reference to `market_news` or `/api/news` — there is none. The `news`
module is fully built on the backend and completely unused by the frontend. (The `market_news` table
is currently empty — 0 rows — but that's a separate, secondary observation: even if it had content,
nothing would display it.)

**Expected:** the "News" nav tab shows news — market commentary/articles from the `news` module — or
is relabeled/restructured so its content matches its name.
**Actual:** "News" shows price alerts and a static release calendar; the actual news feature is
orphaned.

**Reproduce:** sign in, click "News" in the nav bar, compare the panel titles ("Price Alerts",
"Release Calendar") against the nav label ("News"). Cross-reference `modules/news/handlers.ts` and
`market_news` table against `client/src/pages/MarketNewsPage.tsx`.

## Scope
- Decide (founder call) whether to: (a) wire the existing `market_news`/`/api/news` module into the
  News tab as actual news content, alongside or instead of the current alerts/calendar panels, or
  (b) rename the nav tab to match what it actually shows (e.g. "Alerts").
- If (a): the release calendar should be sourced from real data (or removed) rather than hardcoded
  placeholder dates, consistent with the no-fake-data policy already established for Overview
  (ARCA-46).

## Out of scope
- Populating the `market_news` table with real content (a content/ops task, not a code task).
- Any change to the Price Alerts table's own logic — it's functioning correctly, just misplaced
  under a "News" label.

## Acceptance criteria
- [ ] The "News" nav tab's content matches what "News" means to a collector, or the tab is
      relabeled to match its actual content.
- [ ] No hardcoded/placeholder data is presented as if it were live (release calendar or otherwise)
      without being sourced from real data or clearly marked as indicative.
- [ ] If the news module is wired in, `market_news` content (once present) is visible somewhere in
      the product — not orphaned.

# ARCA-47 — The "News" nav item shows no news, and its release calendar is hardcoded fake data

**Status:** Planned · **Area:** Frontend/Content · **Depends on:** ARCA-18, ARCA-29

## Context
Filed from the ARCA-43 UI/UX audit. CLAUDE.md lists a `news` module with a `market_news` table and
CRUD handlers, and the nav has a dedicated "News" item — so a new user reasonably expects articles or
market commentary there.

## What I did
Signed up fresh, clicked "News" in the nav (`/news`, `MarketNewsPage.tsx`). Also queried the backend:
```
curl http://localhost:3001/api/news        → {"data":[]}
```
and read `client/src/pages/MarketNewsPage.tsx` in full.

## What happened
The News page contains zero news content. It renders:
1. A "Price Alerts" table — the exact same `>5% move` data already shown on Overview and Screener
   (it calls `/market/alerts`, not `/news`).
2. A "Release Calendar" sidebar panel listing four set releases with dates in 2026. These are not
   fetched from any API or the `market_news`/database — they are a hardcoded array in the component
   source itself:
   ```ts
   // Release calendar placeholder
   const releaseCalendar = [
     { date: "2026-03-28", name: "Prismatic Evolutions: Surprise Box" },
     { date: "2026-04-04", name: "Journey Together" },
     { date: "2026-06-13", name: "Destined Rivals" },
     { date: "2026-08-08", name: "Space-Time Smackdown" },
   ];
   ```
   (`client/src/pages/MarketNewsPage.tsx:95-101`, the comment "placeholder" is in the source itself.)
3. An "About Alerts" blurb explaining the alerts table.

`GET /api/news` confirms the actual news table is empty — there is no path in the UI that ever shows
a real news article, and the one piece of "News" content that looks like real data (the release
calendar) is static fake data baked into the client, not sourced from anywhere live.

This sits in tension with the founder policy already recorded in
`docs/tickets/overview-welcome-empty-states.md` — "ARCA never shows fake/demo data to fill empty
states." The release calendar is exactly that: fake, static, will silently go stale, and nothing
distinguishes it from real data in the UI.

## What I expected
A News destination to show actual market news/articles (or an honest empty state saying no news
exists yet), not a re-skin of a table already shown elsewhere plus hardcoded placeholder dates.

## Repro steps
1. Sign in, click "News" in the nav.
2. Compare its "Price Alerts" table to the one on `/overview` or `/screener` — same data, same shape.
3. `curl http://localhost:3001/api/news` → empty array, confirming no news is ever fetched here.
4. Read `client/src/pages/MarketNewsPage.tsx:95-101` for the hardcoded release calendar.

## Acceptance criteria
- [ ] `/news` either shows real news content from the `news` module, or an honest, explicit empty
      state ("No market news yet") instead of duplicating the alerts table as if it were news.
- [ ] The release calendar is sourced from real data (or removed) rather than hardcoded placeholder
      dates in the client source.

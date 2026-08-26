# PRP — ARCA-055-news-tab-shows-alerts-not-news

## Intent
A collector who clicks "News" sees actual news — articles/commentary from the already-built `market_news` API — instead of a price-alerts table and a hardcoded, stale release calendar.

## Context
- `client/src/pages/MarketNewsPage.tsx` renders a two-column layout: main panel is a "Price Alerts" `DataTable` (fetches `/market/alerts?limit=50&period=...` via `usePolling`, 120s interval), sidebar has a "Release Calendar" panel with 4 hardcoded `{date, set}` entries (lines ~95-100, rendered ~156-175, comment `// Release calendar placeholder`) plus a static "About Alerts" blurb. Nothing on the page reads from `market_news`.
- Backend news module is fully built and unused by the client: `modules/news/handlers.ts` exposes `GET /api/news?limit=` (returns `{ data: MarketNewsRecord[] }` ordered by `published_at DESC`), `GET /api/news/:cardId` (filter by card), `POST /api/news` (create). Schema (`modules/analytics/schema.ts:86-103`, table `market_news`): `id, title, summary, source, url, published_at, card_ids, sentiment, created_at`. Table currently has 0 rows — no seed script populates it (out of scope to add content).
- Nav tab is defined in `client/src/components/Layout.tsx:29` (`{ href: "/news", label: "News", icon: Newspaper }`) and routed in `app.tsx:44-45` to `<MarketNewsPage />`. No other tab currently covers "Alerts."
- Established idiomatic patterns to follow: `usePolling` hook for fetch+interval (as already used for alerts in this same page and in `client/src/components/terminal/NewsPanel.tsx`), `PanelEmptyState`/`PanelErrorState` components (`client/src/components/terminal/PanelEmptyState.tsx`) for the loading/empty/error tri-state, matching the no-fake-data precedent set by ARCA-46 on `OverviewPage.tsx`.
- ARCA-29 (separate, planned ticket) owns building a real, data-driven release calendar — out of scope here. This ticket only requires the hardcoded calendar not be presented as live data, so removing it (rather than building a replacement) is the correct-sized fix.
- ARCA-18 (shipped) already built the CRUD API this ticket wires in; no backend changes are needed.

## Approach
Keep the "News" label and restructure `MarketNewsPage.tsx` so it actually shows news: add a real News panel that fetches `GET /api/news` and renders items (title, source, published_at, link) with proper loading/empty/error states via `PanelEmptyState`/`PanelErrorState` (empty state expected since `market_news` has 0 rows today — message it as "no news yet," not an error). Promote this to the primary panel position. Demote "Price Alerts" to a clearly-labeled secondary panel (it stays, per out-of-scope note, functioning as-is) so its content isn't mistaken for news. Remove the hardcoded "Release Calendar" sidebar panel entirely rather than fabricate a data source for it (ARCA-29's job).

Files touched:
- `client/src/pages/MarketNewsPage.tsx` — add news-fetching panel, reposition/relabel alerts panel, delete hardcoded calendar block and its placeholder data.
- Possibly a new small presentational component (e.g. `client/src/components/terminal/MarketNewsPanel.tsx`) if the news list warrants its own file for consistency with existing panel components — otherwise inline within `MarketNewsPage.tsx`.

## Tasks
- [ ] Add a data-fetching News panel to `MarketNewsPage.tsx` (or a new `MarketNewsPanel` component) that calls `GET /api/news` via the existing `usePolling`/`api.get` pattern and renders title, source, published date, and link per item.
- [ ] Wire loading state (spinner) and error state (`PanelErrorState`) for the news fetch.
- [ ] Wire empty state (`PanelEmptyState`) for when `market_news` returns zero rows, with copy that reflects "no news yet" rather than implying failure.
- [ ] Reposition the News panel as the page's primary content; relabel/reposition the existing Price Alerts table as a distinct, clearly-labeled secondary panel so it's not confused with news.
- [ ] Delete the hardcoded "Release Calendar" panel and its placeholder date/set array from `MarketNewsPage.tsx`.
- [ ] Confirm the nav tab (`Layout.tsx:29`) still points at `/news` → `MarketNewsPage` with no other changes needed.

## Validation gates
- [ ] happy path: with rows present in `market_news` (manually inserted for a test/dev check), the News tab lists them with title, source, and published date, sourced from `GET /api/news`.
- [ ] edge cases: with `market_news` empty (today's actual state), the News tab shows a `PanelEmptyState` (not an error, not a blank panel, not fake data) explaining there's no news yet.
- [ ] errors: if `GET /api/news` fails (network/5xx), the panel shows `PanelErrorState` distinct from the empty state, and the rest of the page (Price Alerts panel) still renders independently.
- [ ] coverage: `client/src/pages/MarketNewsPage.tsx` no longer contains any hardcoded date/set array standing in for the release calendar, and a repo-wide grep for the removed placeholder strings (e.g. "Prismatic Evolutions: Surprise Box") returns no matches.

<!-- foundry-ticket: a98b848d4494eeb3 -->

# PRP — ARCA-069-auction-feed-ingestion

## Intent
Give ARCA a live, self-refreshing feed of active eBay (incl. PWCC) auction-style listings for PSA/BGS-graded WOTC-era Pokémon singles, matched to ARCA's existing card catalog, so the next tickets (auctions view, notifications) have real data to build on.

## Context
- Decision doc `context/build/auction-aggregator-v1-scope.md` and research ticket `docs/tickets/ARCA-068-auction-source-research.md` confirm the source: eBay Browse API (public, app-token auth, covers eBay-hosted + PWCC listings). eBay's Marketplace Insights (sold data) is off-limits by ToS — this ticket only touches **active** listings, which the Browse API supports.
- No auction code exists yet. `git log` shows commits for ARCA-069/070/071/072 that only added ticket docs (`docs/tickets/ARCA-0*.md`) — this is genuinely greenfield; `modules/` has no `auctions` directory.
- Module shape to follow: `modules/pricing/` (`schema.ts`, `handlers.ts`, `jobs.ts`, `index.ts`, `providers/`) is the closest analog — an external multi-source fetch pipeline matched against `modules/cards` catalog rows.
- Catalog matching target: `modules/cards/schema.ts` — `cards` table keyed by `external_id`, with `name`, `set_name`, `set_code`, `card_number`. There is no existing "WOTC-era" flag anywhere in the schema or code (`grep -ri wotc` only hits ticket docs) — this ticket must define a WOTC-era set allowlist (Base Set through the Neo/Skyridge era, pre-EX) to filter both eBay search terms and catalog matches.
- Grade capture pattern: `modules/pricing/schema.ts` → `gradedPrices` (`grading_company`, `grade` as text) and `modules/psa/handlers.ts` (PSA cert cache, 30-day TTL, `certVerifications` table in `modules/portfolio/schema.ts`) show how grading company + grade are represented elsewhere.
- "Fail loudly" precedent: `modules/pricing/schema.ts` → `priceSourceStatus` table (`status`, `last_error`, `cards_synced`) plus `modules/pricing/jobs.ts` → `updateProviderStatus()`, called around every provider fetch in `syncPrices()`. This is the exact mechanism ARCA-069's "no silent failures" acceptance criterion asks for — reuse the pattern for a new `auction_source_status`-style table rather than only console logging.
- Scheduling pattern: `src/lib/scheduler.ts` (`scheduler.register(name, fn, intervalMs)`), wired via `registerPricingJobs()` etc., called from `server.ts:123-126`. `modules/etl/scheduler.ts` documents interval choices (`ETL_SCHEDULES`). eBay Browse API rate limits (per research ticket) must set the interval — plan a conservative default (e.g. every 15–30 min) and document why.
- Generic retry/backoff helper already exists: `modules/etl/pipeline.ts` (`runETL`/`runAllETL`) — exponential backoff, per-source try/catch, structured result. Prefer wrapping the eBay extract in this rather than writing new retry logic.
- DB tables are NOT drizzle-kit generated — `db/push.ts` is a hand-written script of raw `CREATE TABLE IF NOT EXISTS` + index statements run via `bun run db:push`. Any new table needs both a Drizzle schema (`modules/auctions/schema.ts`) and a matching block added to `db/push.ts`.
- App wiring: `server.ts` imports each module's router and `register*Jobs` function, calls `app.route("/api/...")` and `register*Jobs()` near lines 9-21, 74-83, 123-127.
- No eBay credentials exist yet in `.env.example` (only `POKEMON_TCG_API_KEY`, `BETTER_AUTH_*`, `ARCA_ENCRYPTION_KEY`) — need `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` (Browse API app-token OAuth, client-credentials grant) added there and read via `process.env` like the PSA/Pokémon TCG providers do.
- Related tickets already merged as doc stubs only: ARCA-070 (auctions view), ARCA-071 (notifications), ARCA-072 (QA) all depend on this ticket and are still unimplemented — out of scope here, but the storage shape chosen now is what they'll consume.

## Approach
Smallest correct change: one new `modules/auctions/` module, following the pricing module's shape, plus the minimal wiring into `server.ts` and `db/push.ts`.

Files to touch/add:
- `modules/auctions/schema.ts` — new `auction_listings` table (matched `card_id`, `grading_company`, `grade`, `current_bid_cents`, `currency`, `end_time`, `source` = `'ebay'`, `seller`, `listing_url`, `external_listing_id` unique, `status`, `fetched_at`) and an `auction_source_status` table mirroring `priceSourceStatus`.
- `modules/auctions/ebay.ts` (or `providers/ebay.ts`) — eBay Browse API client: OAuth app-token fetch/cache, search-by-category/keyword scoped to WOTC-era Pokémon + graded filters, response → raw listing shape.
- `modules/auctions/match.ts` — matches a raw eBay listing (title/keywords) to an existing `cards` row + parses grading company/grade from the title (eBay listings don't carry structured grade fields); listings that can't be confidently matched are dropped/logged, not stored as orphans.
- `modules/auctions/jobs.ts` — `syncAuctionListings()` orchestrator (extract via `runETL`/`runAllETL` from `modules/etl/pipeline.ts`, transform via `match.ts`, load/upsert into `auction_listings`, update `auction_source_status` on success/failure) + `registerAuctionJobs()` using `scheduler.register`.
- `modules/auctions/handlers.ts` — thin read-only Hono router (`GET /api/auctions` list, `GET /api/auctions/status`) so the ingestion is inspectable now and ARCA-070 has an endpoint to build against; no write endpoints (ingestion is job-driven).
- `modules/auctions/index.ts` — re-export barrel, matching `modules/pricing/index.ts`.
- `db/push.ts` — add `CREATE TABLE IF NOT EXISTS auction_listings`, `auction_source_status`, and their indexes (unique on `external_listing_id`; index on `card_id`, `end_time`).
- `server.ts` — import + mount `auctionsRouter` at `/api/auctions`, call `registerAuctionJobs()` alongside the other `register*Jobs()` calls.
- `.env.example` — add `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` placeholders.
- A small WOTC-era set allowlist (constant in `modules/auctions/match.ts` or a shared `src/lib` constant) since nothing in the catalog currently flags card era.

## Tasks
- [ ] Add `EBAY_CLIENT_ID`/`EBAY_CLIENT_SECRET` to `.env.example` and read them via `process.env` in the eBay client
- [ ] Build the eBay Browse API OAuth (client-credentials) token fetch with caching/expiry handling
- [ ] Build the eBay Browse API search call scoped to auction-style, active, graded WOTC-era Pokémon listings
- [ ] Define the WOTC-era set allowlist used to scope both the eBay search and catalog matching
- [ ] Write `modules/auctions/schema.ts` (`auction_listings`, `auction_source_status`) and add matching `CREATE TABLE`/index statements to `db/push.ts`
- [ ] Write listing → `cards` catalog matcher, including grading company/grade extraction from listing titles, with unmatched listings dropped and logged (not stored as orphans)
- [ ] Write `syncAuctionListings()` using `modules/etl/pipeline.ts`'s retry/backoff, upserting by `external_listing_id`
- [ ] Write `auction_source_status` updates (`syncing`/`ok`/`error` + `last_error`) around every ingestion run, mirroring `updateProviderStatus` in `modules/pricing/jobs.ts`
- [ ] Register the ingestion job on a schedule sized to eBay's documented rate limit via `scheduler.register`, and wire `registerAuctionJobs()` into `server.ts`
- [ ] Add read-only `GET /api/auctions` and `GET /api/auctions/status` handlers, mounted at `/api/auctions` in `server.ts`
- [ ] Write unit tests for the matcher (title → card + grade) and the status upsert, following `modules/pricing/jobs.test.ts`'s pattern

## Validation gates
- [ ] happy path: running the ingestion job against a live/staged eBay Browse API response stores rows in `auction_listings` with a non-null `card_id`, correct `grading_company`/`grade`, `current_bid_cents`, `end_time`, and `listing_url`
- [ ] happy path: a second run upserts existing listings by `external_listing_id` (bid/end-time refresh) rather than duplicating rows
- [ ] edge cases: listings for non-WOTC-era sets, non-PSA/BGS grading, or ungraded/raw cards are excluded before storage
- [ ] edge cases: a listing whose title can't be confidently matched to a catalog `card_id` is logged and skipped, never inserted with a null/guessed `card_id`
- [ ] errors: an eBay API failure (auth failure, non-2xx, timeout) is retried per `runETL`'s backoff, and a run that exhausts retries writes `status = 'error'` with a populated `last_error` to `auction_source_status` — it does not fail silently or leave stale `ok` status
- [ ] errors: `GET /api/auctions/status` surfaces the current `auction_source_status` row(s) so a failed run is visible without reading logs
- [ ] coverage: unit tests cover the title-matching function (card+grade extraction) for at least one match and one no-match case
- [ ] coverage: unit tests cover the `auction_source_status` upsert (insert-when-absent, update-when-present) mirroring `modules/pricing/jobs.test.ts`

<!-- foundry-ticket: 2cacb01650f760a0 -->

# Auction Source Research — Which Houses Can ARCA Realistically Pull Live Listings From

**Ticket:** ARCA-068 · **Status:** Findings complete, awaiting founder go/no-go · **Depends on:** —

This is a research/decision document only — no code changes ship with it. It answers, for eBay
(incl. PWCC/Fanatics Collect), Goldin, and Heritage Auctions, whether ARCA can build a live
auction-listings feed against real, accessible data — and corrects two assumptions in the original
ARCA-068 ticket text that turned out to be stale or imprecise. The actual build is ARCA-069.

## 1. eBay Browse API — what it returns for auction-style listings

The Browse API (`developer.ebay.com/api-docs/buy/browse/overview.html`) does return live
auction-style listings, not just fixed-price "Buy It Now" items — filter with
`buyingOptions:{AUCTION}` on the `item_summary/search` call
(https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search,
https://developer.ebay.com/api-docs/buy/browse/types/gct:ItemSummary).

Confirmed auction-relevant fields on `ItemSummary`, cross-checked via eBay's own field docs
(https://developer.ebay.com/api-docs/buy/browse/types/gct:ItemSummary) and corroborating search
results:
- `currentBidPrice` — current highest bid (value + currency), **only returned for auction items**.
- `bidCount` — total bids placed, **only returned for auction items**.
- `itemEndDate` — UTC timestamp the listing closes.
- `condition` — an ID (e.g. 1000 = New) mapped via a separate condition-ID reference table, not a
  card-grading field.
- `title`, `itemWebUrl`, `seller`, category data.

**Important gotcha:** by default the `item_summary/search` call does **not** return auctions or
auction fields at all — `currentBidPrice`/`itemEndDate` are only populated when the caller
explicitly filters for `buyingOptions:{AUCTION}`. A naive integration that doesn't set this filter
will silently get zero auction data back, not an error.

**No structured "grade" field exists.** PSA/BGS grade (e.g. "PSA 10") is not a first-class field
anywhere in the Browse API schema — it has to be parsed out of the free-text `title`, the same way
ARCA already handles grade extraction elsewhere. This matters directly for ARCA-069's catalog
matching: listing → card+grade matching will need title parsing (regex for grading company + grade
number), not a clean field join.

## 2. eBay rate limits and developer access lead time

- **Browse API: 5,000 calls/day** at the application level (not per-user), per eBay's rate-limit
  framework. This figure is corroborated by eBay's own `api:RateLimit` schema docs and multiple
  developer-community threads; I could not get the primary rate-limits table page
  (`developer.ebay.com/develop/apis/represents/rate-limits`) to load directly during this research
  (repeated timeouts), so treat the 5,000/day number as **secondary-source-corroborated, not
  primary-doc-quoted** — worth a manual re-check before ARCA-069 sizes its poll schedule against it.
  Limit increases are available via a free "Application Growth Check" request to eBay.
- **Access lead time:** standard developer account approval is fast (~1 business day per eBay's own
  onboarding docs). Buy API access specifically (which includes Browse) goes through an eBay
  Partner Network review that eBay's own docs say can take **up to 10 business days**
  (https://developer.ebay.com/api-docs/buy/static/buy-requirements.html). Net: budget **1–2 weeks**
  for production Browse API keys, self-serve, no business conversation required.

## 3. eBay real-time notifications — corrects the ticket's "ItemClosed" claim

eBay does have a genuine push notification system, **Platform Notifications**
(https://developer.ebay.com/api-docs/static/platform-notifications-landing.html), which is a real
webhook mechanism distinct from polling.

**The ticket's framing is imprecise and needs correcting for ARCA-071's design:** `ItemClosed` is
**not** a "listing ended / sold" event. Per eBay's own notification docs
(`developer.ebay.com/api-docs/static/pn_item-closed.html`, confirmed via search-indexed content
after the primary page repeatedly timed out on direct fetch), `ItemClosed` fires specifically when a
**fixed-price listing ends with no buyer, or an auction ends with no winning bid** — it is the
*unsold* case, sent shortly after the seller-facing `ItemUnsold` notification. The payload matches a
`GetItemResponse` with default details.

The event for an auction that **does** sell is different: `ItemWon` (buyer-side) /
`ItemSold`-equivalent seller-side notifications exist in the same Platform Notifications family, but
I could not fetch their exact payload docs directly (repeated timeouts on
`pn_item-won.html`) — this needs a follow-up direct check before ARCA-071 designs its "auction ending
soon" trigger around it.

**Practical implication for ARCA-071:** Platform Notifications are part of eBay's older Trading API
notification stack, not confirmed as available on the modern Buy/Browse API surface ARCA-069 would
build ingestion on. A polling-based "ending soon" check against `itemEndDate` (already returned by
Browse API search, see §1) is the more realistic v1 mechanism — event-driven notifications are a
possible fast-follow, not a confirmed v1 building block.

## 4. eBay Marketplace Insights API (sold/completed data) — confirmed restricted

Confirmed to exist and be gated, not generally available. It's a "Limited Release" API providing 90
days of sold-item history; eBay's current developer-community guidance is that it is **not open to
new applicants** (https://community.ebay.com/forum/talk-to-your-fellow-developers-57970/topic/marketplace-insights-api-access-168586/).
Terapeak — eBay's seller-facing sold-comps tool — is free inside Seller Hub but has **no public API**;
access is UI-only (https://export.ebay.com/en/resources/important-updates/ebay-news-archive/terapeak).

This is squarely a **historical/sold-data** restriction, separate from the live/active-listing data
in §1 — ARCA-069 only needs active auction-style listings (current bid, end time), which the Browse
API does provide. The restriction matters for a *future* "sold comps" feature, not for v1 ingestion.

## 5. eBay developer terms — market-research restriction, confirmed

A community thread eBay itself links developers to
(https://community.ebay.com/t5/Traditional-APIs-Search/Active-listing-and-sold-item-search-data/td-p/34152432)
states the API License Agreement prohibits using eBay API data for market research, directing
developers to Terapeak (UI-only, see §4) instead. Separately, a secondary source (EcommerceBytes,
July 2025, quoting eBay's June 24, 2025 updated agreement) reports eBay's API License Agreement
(https://developer.ebay.com/join/api-license-agreement) now defines "Restricted APIs" as those
providing "data or insights related to market trends, pricing strategies, sales volumes, user
behavior, or related information," gated to select approved developers, and explicitly bars feeding
Restricted API data into any third-party generative-AI tool without eBay's written consent
(https://www.ecommercebytes.com/2025/07/18/ebay-restricts-developers-from-using-its-data-to-train-ai/).

**I could not load the primary License Agreement page directly to quote its exact current wording**
(repeated timeouts during this research) — the language above is secondary-sourced and should be
re-verified against the primary document by a human before ARCA-069 or any public-facing feature
built on eBay data ships. See §9 for the explicit risk flag this deserves.

## 6. PWCC — the ticket's premise is out of date

The original ARCA-068 ticket text asserts "PWCC's inventory is largely sold through eBay." **This is
no longer accurate and should not be assumed by ARCA-069.**

- eBay delisted PWCC in **December 2021** amid shill-bidding accusations (which PWCC disputed);
  PWCC subsequently built its own independent auction platform
  (https://www.sportscollectorsdaily.com/pwcc-marketplace-sold-to-fanatics/).
- Fanatics Collectibles **acquired PWCC in May 2023**
  (https://www.espn.com/espn/story/_/id/37709968/fanatics-collectibles-acquires-pwcc-marketplace,
  https://frontofficesports.com/fanatics-buys-pwcc-to-compete-in-collectibles-auction-space/).
- In **July 2024, Fanatics retired the PWCC brand and relaunched it as Fanatics Collect**
  (https://www.sportscollectorsdaily.com/fanatics-collect-sothebys-trading-cards-pwcc/,
  https://www.fanaticscollect.com/newsroom/pwcc-is-now-fanatics-collect), which now runs weekly and
  "Premier" auctions, a fixed-price marketplace, and vaulting as a standalone platform.

**Net effect:** PWCC inventory today is not eBay inventory — it's Fanatics Collect inventory. Any
ARCA-069 scope line that says "eBay's Browse API, covering eBay-hosted and PWCC listings" is wrong on
the PWCC half and needs to be corrected to just "eBay-hosted listings" — see §10.

## 7. Goldin Auctions — no public API

No public developer API, docs, or self-serve data program exists (no `developer.goldinauctions.com`,
no hits for "Goldin Auctions API" beyond unrelated third-party listings). eBay **acquired Goldin in
April 2024** and is integrating it via single sign-on and cross-promotion
(https://www.valueaddedresource.net/ebay-goldin-single-sign-on-cross-promotion/,
https://otia.com/news/ebay-completes-acquisition-of-goldin-and-integration-with-psa-vault/), but
there is no evidence eBay's Developer Program has been extended to cover Goldin's own auction
listings.

A commercial third-party scraper (Apify's "Goldin Auctions Marketplace Scraper") states it "connects
directly to Goldin's search API — no browser," implying Goldin's frontend is backed by an internal,
undocumented JSON API
(https://apify.com/jungle_synthesizer/goldin-auctions-marketplace-scraper/api). This is evidence the
data is technically reachable, not that it's authorized — Goldin's terms of service
(`goldin.co/terms`) could not be directly fetched during this research (repeated timeouts) to confirm
or quote anti-scraping language. No known litigation or public anti-bot controversy specific to
Goldin was found, unlike Heritage (§8). **No dedicated data-partnership contact path was found** —
only general consignment/business-development contacts.

**Conclusion: scrape-or-partnership only, not a pure API integration.** ToS language is unconfirmed
and should be checked by hand before building anything against it.

## 8. Heritage Auctions — no public API, active legal enforcement against scraping

No public API for auction listings or realized prices. Heritage does run a developer API
(`heritageauctionsexternal.developer.azure-api.net`) but it is gated to **"Dealer Direct" partners**
for syncing dealer inventory *into* Heritage, not for pulling auction/bidding data out — confirmed
via third-party integrator SyncAuction (https://syncauction.com/) and a Heritage job posting for an
"API Developer/Data Engineer" describing it as an internal/partner system
(https://www.linkedin.com/jobs/view/api-developer-data-engineer-at-heritage-auctions-4005543376).

Heritage's own "Permanent Auction Archive" of realized prices is public browsing but **gated behind
free account registration**, with no CSV/API export found
(https://www.ha.com/heritage-auctions-press-releases-and-news/heritage-opens-members-only-prices-realized-archives-on-web-site.s?releaseId=79).

**This is the clearest legal-risk case of the four sources.** Heritage sued a Christie's subsidiary
(Collectrium) in 2016 for scraping ~3M listings via fake accounts and spider software; an arbitrator
awarded Heritage **~$1.8M**, primarily under the **DMCA** (circumventing access controls), plus CFAA
and breach of contract (https://www.artsy.net/article/artsy-editorial-christies-subsidiary-ordered-pay-heritage-auctions-18-million,
https://news.artnet.com/art-world/collectrium-heritage-data-theft-lawsuit-1612843). Heritage's site
also returned HTTP 403 to this research's own automated fetch attempts, consistent with active bot
detection. Litigation records confirm Heritage's user agreement explicitly bans "database scraping."

**Conclusion: do not build an unauthorized scraper against Heritage.** Any access requires a direct
partnership/data-licensing conversation — no such program was found publicly advertised, only general
business-development contacts.

## 9. Fanatics Collect — no public API; now the real home of PWCC inventory

No public developer API or data-feed program exists for Fanatics Collect specifically. Fanatics runs
a broader "Fanatics Ecosystem" API docs site (`api.docs.fan`) but it doesn't cover the
Collect/cards marketplace. Only unofficial third-party scrapers exist (Apify, Bright Data listings),
one of which states it "clears the site's Cloudflare protection automatically" — i.e. Fanatics
Collect runs active bot mitigation, not an open API
(https://apify.com/jungle_synthesizer/fanaticscollect-weekly-auction-scraper).

Direct fetch of Fanatics Collect's terms-of-service page returned HTTP 403 during this research and
could not be quoted verbatim. The general Fanatics Terms of Use (a different, related property)
prohibits "using any automated system or software to extract data from the Website for commercial
purposes (including 'screen scraping')"
(https://www.fanatics.com/fanatics-terms-of-use/x-6455+z-87173304-1397704712), and Fanatics Live's
terms separately bar bypassing robots.txt or automated crawling
(https://about.fanatics.live/fanatics-live-uk-terms-of-use). Fanatics Collect's own terms were not
independently confirmed to carry the same language — treat as likely-but-unverified.

As established in §6, **Fanatics Collect is where PWCC's auction inventory actually lives today**,
which makes it a source worth a direct partnership conversation even though it has no current public
API — the founder should weigh whether reaching out to Fanatics Collect for data-partner access is
worth pursuing given PWCC's inventory volume, independent of what ARCA-069 builds first.

## 10. Legal / ToS risk — flagged explicitly

- **eBay:** developer-program access is legitimate and self-serve for the Browse API (§1–2), but
  eBay's API License Agreement restricts "Restricted APIs" covering market trends/pricing
  insights/sales volumes, and a community-linked ToS excerpt explicitly forbids using eBay API data
  for **market research** (§5). ARCA is a price/portfolio analytics product — before shipping any
  eBay-sourced auction data into a market-facing feature (price charts, trend scoring, ARCA Score
  inputs), the founder should have this reviewed against the primary license agreement text (not yet
  independently confirmed here, see §5) to determine whether "live auction listing display" falls
  outside the "market research" restriction or needs a direct conversation with eBay. This is
  the single biggest open legal question from this research.
- **Goldin:** ToS scraping language unconfirmed (fetch failures); no known enforcement history found,
  but a scraper being technically possible is not the same as authorized (§7).
  **Do not scrape without a legal review of Goldin's actual terms first.**
  Only a partnership path is currently confirmed-safe.
- **Heritage:** explicit ToS prohibition on scraping **and** a real, prior $1.8M judgment
  (DMCA/CFAA/breach of contract) against a competitor for doing exactly this (§8). **Unauthorized
  scraping of Heritage is a real legal risk, not a theoretical one.** Partnership conversation only.
- **Fanatics Collect:** active bot-mitigation (Cloudflare) present; site-specific ToS not
  independently confirmed but a sibling Fanatics property's terms explicitly ban screen-scraping
  (§9). Partnership conversation only.

## 11. v1 recommendation

**Build ARCA-069 against eBay's Browse API only, for v1.** It is the only source of the four with:
self-serve developer access (§2), confirmed auction-specific fields (current bid, bid count, end
time — §1), and a rate limit (5,000 calls/day) that's workable for a polling-based refresh schedule
matching the pattern ARCA already uses for pricing providers.

Two corrections to carry into ARCA-069's scope, both already reflected above:
1. **Drop "PWCC" from the v1 source description.** PWCC listings are not on eBay (§6) — v1 covers
   eBay-hosted listings only. PWCC/Fanatics Collect inventory is a separate, not-yet-viable source
   (§9).
2. **Design ARCA-071's "ending soon" trigger around polling `itemEndDate` from the Browse API, not
   an `ItemClosed` webhook.** `ItemClosed` is the unsold-listing event, not an ending/sold signal
   (§3) — the notification-payload details for the sold-side event (`ItemWon`) weren't confirmed and
   need a follow-up check before any event-driven design is finalized.

**Goldin, Heritage, and Fanatics Collect are all "no v1 API integration" — flagged as
business/partnership conversations, not build tickets:**
- **Heritage:** do not scrape (real legal precedent, §8/§10). Partnership-only.
- **Goldin:** partnership path preferred; scraping technically possible but unauthorized until ToS is
  reviewed (§7/§10).
- **Fanatics Collect:** partnership path worth pursuing specifically *because* it now holds PWCC's
  volume (§9), independent of eBay's viability — not a v1 blocker, but worth flagging to the founder
  as a parallel business-development thread.

Before ARCA-069 starts, the founder (or whoever has authority to accept the licensing risk) should
resolve the eBay market-research ToS question in §10 — everything else in this recommendation is
build-ready.

## 12. Open questions not assumed away

- **eBay License Agreement primary text unread.** §5/§10's "market research" restriction is sourced
  from a community thread and a secondary news article, not eBay's current primary license-agreement
  page (which repeatedly failed to load during this research). Needs a direct human read before
  ARCA-069 ships anything eBay-derived into a customer-facing feature.
- **`ItemWon` / sold-side notification payload unconfirmed.** §3 could not verify the exact fields
  eBay's sold-auction notification delivers — needed before ARCA-071 finalizes its trigger design.
  Current recommendation is to poll `itemEndDate` instead (§11), sidestepping this gap for v1.
  This means ARCA-071's "in-app notification" is founder-app-generated from ARCA's own poll of
  `itemEndDate`, not sourced from an eBay push event.
- **Browse API rate-limit figure (5,000/day) is secondary-sourced,** not quoted from eBay's primary
  rate-limits table (load failures during this research). Should be re-verified before ARCA-069 sizes
  its poll interval — e.g. whether polling all in-scope PSA/BGS WOTC-era listings hourly stays under
  budget depends on this number being correct.
- **Grade extraction from listing titles is unvalidated.** §1 confirms no structured grade field
  exists — ARCA-069's catalog matching depends on regex/parsing accuracy against real eBay title text
  that hasn't been sampled in this research pass. Expect a non-trivial false-negative/false-positive
  rate; worth a small title-sample spot-check as an early ARCA-069 task rather than assuming clean
  matching.
- **Goldin and Fanatics Collect ToS text unread** (both had fetch failures during this research) —
  §7/§9's risk flags are inferred from sibling-property terms and general auction-industry norms, not
  confirmed against the actual current page text.

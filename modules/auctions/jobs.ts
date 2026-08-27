/**
 * eBay auction listing ingestion — orchestrator + schedule registration.
 *
 * Follows the same shape as modules/pricing/jobs.ts: extract/transform/load wrapped
 * in the shared ETL retry/backoff helper, with a source-status row updated around
 * every run so failures are visible via GET /api/auctions/status instead of only logs.
 */

import { eq, inArray } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import { scheduler } from "../../src/lib/scheduler.ts";
import { cards } from "../cards/schema.ts";
import { runETL } from "../etl/pipeline.ts";
import { type RawAuctionListing, searchActiveGradedListings } from "./ebay.ts";
import { type CatalogCandidate, WOTC_ERA_SET_CODES, matchListing } from "./match.ts";
import { auctionListings, auctionSourceStatus } from "./schema.ts";

const PROVIDER = "ebay";

/** Update auction source status in the database (mirrors updateProviderStatus in pricing/jobs.ts). */
export function updateAuctionSourceStatus(
  provider: string,
  status: string,
  listingsSynced: number,
  error: string | null,
): void {
  const db = getDb();
  const now = new Date();

  const existing = db
    .select({ id: auctionSourceStatus.id })
    .from(auctionSourceStatus)
    .where(eq(auctionSourceStatus.provider, provider))
    .get();

  if (existing) {
    db.update(auctionSourceStatus)
      .set({
        status,
        listings_synced: listingsSynced,
        last_error: error,
        last_sync_at: now,
        updated_at: now,
      })
      .where(eq(auctionSourceStatus.id, existing.id))
      .run();
  } else {
    db.insert(auctionSourceStatus)
      .values({
        provider,
        status,
        listings_synced: listingsSynced,
        last_error: error,
        last_sync_at: now,
        updated_at: now,
      })
      .run();
  }
}

/** WOTC-era Pokemon catalog rows to match listings against. */
function getWotcEraCandidates(): CatalogCandidate[] {
  const db = getDb();
  return db
    .select({
      id: cards.id,
      name: cards.name,
      set_name: cards.set_name,
      set_code: cards.set_code,
      card_number: cards.card_number,
    })
    .from(cards)
    .where(inArray(cards.set_code, [...WOTC_ERA_SET_CODES]))
    .all();
}

/** Upsert a matched listing by external_listing_id (refreshes bid/end-time/status on re-run). */
function upsertListing(params: {
  card_id: string;
  external_listing_id: string;
  title: string;
  grading_company: string;
  grade: string;
  current_bid_cents: number | null;
  currency: string;
  end_time: Date;
  seller: string | null;
  listing_url: string;
}): void {
  const db = getDb();
  const now = new Date();
  const status = params.end_time.getTime() > now.getTime() ? "active" : "ended";

  const existing = db
    .select({ id: auctionListings.id })
    .from(auctionListings)
    .where(eq(auctionListings.external_listing_id, params.external_listing_id))
    .get();

  if (existing) {
    db.update(auctionListings)
      .set({
        current_bid_cents: params.current_bid_cents,
        currency: params.currency,
        end_time: params.end_time,
        seller: params.seller,
        status,
        fetched_at: now,
      })
      .where(eq(auctionListings.id, existing.id))
      .run();
  } else {
    db.insert(auctionListings)
      .values({
        card_id: params.card_id,
        external_listing_id: params.external_listing_id,
        source: PROVIDER,
        title: params.title,
        grading_company: params.grading_company,
        grade: params.grade,
        current_bid_cents: params.current_bid_cents,
        currency: params.currency,
        end_time: params.end_time,
        seller: params.seller,
        listing_url: params.listing_url,
        status,
        fetched_at: now,
      })
      .run();
  }
}

// ---------------------------------------------------------------------------
// syncAuctionListings — extract (eBay) -> transform+match -> load (upsert)
// ---------------------------------------------------------------------------

export async function syncAuctionListings(): Promise<void> {
  console.log("[auctions:sync] Starting eBay auction sync...");
  updateAuctionSourceStatus(PROVIDER, "syncing", 0, null);

  const candidates = getWotcEraCandidates();
  if (candidates.length === 0) {
    console.warn("[auctions:sync] No WOTC-era candidate cards found in catalog, skipping.");
    updateAuctionSourceStatus(PROVIDER, "ok", 0, null);
    return;
  }

  let stored = 0;
  let skipped = 0;

  const result = await runETL(
    {
      name: PROVIDER,
      extract: () => searchActiveGradedListings(),
      transform: (raw) => raw,
      load: async (raw) => {
        stored = 0;
        skipped = 0;
        for (const item of raw as RawAuctionListing[]) {
          if (!item.endTime) {
            skipped++;
            console.warn(
              `[auctions:sync] Skipped listing with no end time: "${item.title}" (${item.externalListingId})`,
            );
            continue;
          }

          const matched = matchListing(item.title, candidates);
          if (!matched) {
            skipped++;
            console.warn(
              `[auctions:sync] Skipped unmatched/out-of-scope listing: "${item.title}" (${item.externalListingId})`,
            );
            continue;
          }

          upsertListing({
            card_id: matched.card_id,
            external_listing_id: item.externalListingId,
            title: item.title,
            grading_company: matched.grading_company,
            grade: matched.grade,
            current_bid_cents: item.currentBidCents,
            currency: item.currency,
            end_time: item.endTime,
            seller: item.seller,
            listing_url: item.listingUrl,
          });
          stored++;
        }
        return stored;
      },
    },
    { maxRetries: 3, retryDelayMs: 2000 },
  );

  if (result.status === "error") {
    console.error(`[auctions:sync] eBay sync failed after retries: ${result.error}`);
    updateAuctionSourceStatus(PROVIDER, "error", stored, result.error ?? "Unknown error");
    return;
  }

  console.log(
    `[auctions:sync] Sync complete. Stored ${stored} listings, skipped ${skipped} unmatched/out-of-scope.`,
  );
  updateAuctionSourceStatus(PROVIDER, "ok", stored, null);
}

// ---------------------------------------------------------------------------
// Register jobs with the scheduler
// ---------------------------------------------------------------------------

export function registerAuctionJobs(): void {
  // eBay's Browse API application tokens carry a per-day call budget shared across all
  // search calls this process makes. A 30-minute interval is a conservative default that
  // keeps well within that budget while still refreshing listings on a useful cadence for
  // auctions that can end within hours; tighten only after confirming the account's actual
  // daily quota in the eBay developer portal.
  scheduler.register("auctions:sync-ebay", syncAuctionListings, 30 * 60 * 1000);
}

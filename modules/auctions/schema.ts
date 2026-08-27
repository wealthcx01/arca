import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createId } from "../../src/lib/nanoid.ts";

// ---------------------------------------------------------------------------
// Auction listings — active auction-style listings matched to ARCA's catalog
// ---------------------------------------------------------------------------

export const auctionListings = sqliteTable("auction_listings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  card_id: text("card_id").notNull(),
  external_listing_id: text("external_listing_id").notNull().unique(),
  source: text("source").notNull(), // 'ebay'
  title: text("title").notNull(),
  grading_company: text("grading_company").notNull(), // 'PSA', 'BGS'
  grade: text("grade").notNull(), // '10', '9.5', '9'
  current_bid_cents: integer("current_bid_cents"),
  currency: text("currency").notNull(),
  end_time: integer("end_time", { mode: "timestamp_ms" }).notNull(),
  seller: text("seller"),
  listing_url: text("listing_url").notNull(),
  status: text("status").notNull().default("active"), // 'active', 'ended'
  fetched_at: integer("fetched_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// Auction source status — ingestion health tracking, mirrors price_source_status
// ---------------------------------------------------------------------------

export const auctionSourceStatus = sqliteTable("auction_source_status", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  provider: text("provider").notNull().unique(),
  status: text("status").notNull().default("idle"), // 'idle', 'syncing', 'ok', 'error'
  last_sync_at: integer("last_sync_at", { mode: "timestamp_ms" }),
  last_error: text("last_error"),
  listings_synced: integer("listings_synced").notNull().default(0),
  updated_at: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type AuctionListing = typeof auctionListings.$inferSelect;
export type NewAuctionListing = typeof auctionListings.$inferInsert;
export type AuctionSourceStatusRecord = typeof auctionSourceStatus.$inferSelect;

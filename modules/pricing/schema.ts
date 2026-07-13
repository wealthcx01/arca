import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createId } from "../../src/lib/nanoid.ts";

export const cardPrices = sqliteTable("card_prices", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  card_id: text("card_id").notNull(),
  source: text("source").notNull(), // 'tcgplayer', 'cardmarket', 'tcgdex', 'tcgcsv'
  market_price_cents: integer("market_price_cents"),
  low_price_cents: integer("low_price_cents"),
  mid_price_cents: integer("mid_price_cents"),
  high_price_cents: integer("high_price_cents"),
  currency: text("currency").notNull(), // 'USD', 'EUR'
  variant: text("variant").notNull(), // 'normal', 'holofoil', 'reverseHolofoil', '1stEdition'
  conflated_rank: integer("conflated_rank").default(0), // 1 = best source for this card+variant
  fetched_at: integer("fetched_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const priceHistory = sqliteTable("price_history", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  card_id: text("card_id").notNull(),
  source: text("source").notNull(),
  market_price_cents: integer("market_price_cents"),
  mid_price_cents: integer("mid_price_cents"),
  currency: text("currency").notNull(),
  variant: text("variant").notNull(),
  recorded_at: integer("recorded_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const fxRates = sqliteTable("fx_rates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  base: text("base").notNull(),
  quote: text("quote").notNull(),
  rate: integer("rate").notNull(), // Rate * 1_000_000
  fetched_at: integer("fetched_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// BYOK API keys — encrypted per-user keys for paid providers
// ---------------------------------------------------------------------------

export const userApiKeys = sqliteTable("user_api_keys", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  user_id: text("user_id").notNull(),
  provider: text("provider").notNull(), // e.g. 'pokemon-price-tracker', 'poketrace', 'pricecharting'
  encrypted_key: text("encrypted_key").notNull(), // AES-256-GCM encrypted
  is_active: integer("is_active", { mode: "boolean" }).notNull().default(true),
  daily_usage: integer("daily_usage").notNull().default(0),
  last_used_at: integer("last_used_at", { mode: "timestamp_ms" }),
  created_at: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updated_at: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// Graded prices — grade-specific pricing from PSA/CGC/BGS sources
// ---------------------------------------------------------------------------

export const gradedPrices = sqliteTable("graded_prices", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  card_id: text("card_id").notNull(),
  source: text("source").notNull(), // e.g. 'pokemon-price-tracker', 'poketrace', 'pricecharting'
  grading_company: text("grading_company").notNull(), // 'PSA', 'CGC', 'BGS'
  grade: text("grade").notNull(), // '10', '9.5', '9'
  price_cents: integer("price_cents").notNull(),
  currency: text("currency").notNull(),
  sale_type: text("sale_type").notNull(), // 'market', 'last_sold', 'average'
  fetched_at: integer("fetched_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// Price source status — provider health tracking
// ---------------------------------------------------------------------------

export const priceSourceStatus = sqliteTable("price_source_status", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  provider: text("provider").notNull().unique(),
  status: text("status").notNull().default("idle"), // 'idle', 'syncing', 'ok', 'error'
  last_sync_at: integer("last_sync_at", { mode: "timestamp_ms" }),
  last_error: text("last_error"),
  cards_synced: integer("cards_synced").notNull().default(0),
  updated_at: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type CardPrice = typeof cardPrices.$inferSelect;
export type NewCardPrice = typeof cardPrices.$inferInsert;
export type PriceHistoryRecord = typeof priceHistory.$inferSelect;
export type NewPriceHistoryRecord = typeof priceHistory.$inferInsert;
export type FxRate = typeof fxRates.$inferSelect;
export type NewFxRate = typeof fxRates.$inferInsert;
export type UserApiKey = typeof userApiKeys.$inferSelect;
export type GradedPrice = typeof gradedPrices.$inferSelect;
export type PriceSourceStatusRecord = typeof priceSourceStatus.$inferSelect;

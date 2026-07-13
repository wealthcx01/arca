import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createId } from "../../src/lib/nanoid.ts";

// ---------------------------------------------------------------------------
// card_ohlc_daily — Daily OHLC bars synthesized from price_history
// ---------------------------------------------------------------------------

export const cardOhlcDaily = sqliteTable("card_ohlc_daily", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  card_id: text("card_id").notNull(),
  currency: text("currency").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  open_cents: integer("open_cents").notNull(),
  high_cents: integer("high_cents").notNull(),
  low_cents: integer("low_cents").notNull(),
  close_cents: integer("close_cents").notNull(),
  source_count: integer("source_count").notNull().default(1),
  created_at: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// technical_indicators — Pre-computed indicator values per card per date
// ---------------------------------------------------------------------------

export const technicalIndicators = sqliteTable("technical_indicators", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  card_id: text("card_id").notNull(),
  currency: text("currency").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  indicator: text("indicator").notNull(), // 'SMA_20', 'EMA_12', 'RSI_14', etc.
  value_e6: integer("value_e6").notNull(), // value × 1,000,000
  created_at: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// card_analytics — Composite analytics snapshot per card (refreshed daily)
// ---------------------------------------------------------------------------

export const cardAnalytics = sqliteTable("card_analytics", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  card_id: text("card_id").notNull(),
  currency: text("currency").notNull(),
  volatility_e6: integer("volatility_e6"), // Parkinson estimator × 1M
  sharpe_e6: integer("sharpe_e6"), // Sharpe ratio × 1M
  max_drawdown_bp: integer("max_drawdown_bp"), // basis points
  liquidity_score: integer("liquidity_score"), // 0-100
  trend_score: integer("trend_score"), // -100 to +100
  vwap_cents: integer("vwap_cents"), // provider-weighted average
  arca_score: integer("arca_score"), // 0-100 composite
  grading_alpha_bp: integer("grading_alpha_bp"), // best grading alpha in bp
  updated_at: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// pop_reports — PSA/CGC/BGS population data
// ---------------------------------------------------------------------------

export const popReports = sqliteTable("pop_reports", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  card_id: text("card_id").notNull(),
  grading_company: text("grading_company").notNull(), // 'PSA', 'CGC', 'BGS'
  grade: text("grade").notNull(), // '10', '9.5', '9'
  population: integer("population").notNull(),
  population_higher: integer("population_higher").notNull().default(0),
  total_pop: integer("total_pop").notNull().default(0),
  fetched_at: integer("fetched_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// market_news — Pokemon TCG market news/events
// ---------------------------------------------------------------------------

export const marketNews = sqliteTable("market_news", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  title: text("title").notNull(),
  summary: text("summary"),
  source: text("source").notNull(),
  url: text("url"),
  published_at: integer("published_at", { mode: "timestamp_ms" }).notNull(),
  card_ids: text("card_ids"), // JSON array of related card IDs
  sentiment: text("sentiment").notNull().default("neutral"), // 'positive'|'negative'|'neutral'
  created_at: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// market_index_daily — ARCA Market Index (aggregate market performance)
// ---------------------------------------------------------------------------

export const marketIndexDaily = sqliteTable("market_index_daily", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  date: text("date").notNull().unique(), // YYYY-MM-DD
  index_value_e6: integer("index_value_e6").notNull(), // base 1,000,000 = day 1
  total_market_cap_cents: integer("total_market_cap_cents").notNull(),
  card_count: integer("card_count").notNull(),
  avg_price_cents: integer("avg_price_cents").notNull(),
  median_price_cents: integer("median_price_cents").notNull(),
  top10_concentration_bp: integer("top10_concentration_bp").notNull(), // HHI in bp
  created_at: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type CardOhlc = typeof cardOhlcDaily.$inferSelect;
export type NewCardOhlc = typeof cardOhlcDaily.$inferInsert;
export type TechnicalIndicator = typeof technicalIndicators.$inferSelect;
export type CardAnalyticsRecord = typeof cardAnalytics.$inferSelect;
export type PopReport = typeof popReports.$inferSelect;
export type MarketNewsRecord = typeof marketNews.$inferSelect;
export type MarketIndexRecord = typeof marketIndexDaily.$inferSelect;

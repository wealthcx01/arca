import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createId } from "../../src/lib/nanoid.ts";

export const dailyPerformance = sqliteTable("daily_performance", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  portfolio_id: text("portfolio_id").notNull(),
  date: integer("date", { mode: "timestamp_ms" }).notNull(),
  mktvalue_bod_cents: integer("mktvalue_bod_cents").notNull(),
  mktvalue_eod_cents: integer("mktvalue_eod_cents").notNull(),
  pnl_cents: integer("pnl_cents").notNull(),
  price_pnl_cents: integer("price_pnl_cents").notNull(),
  fx_pnl_cents: integer("fx_pnl_cents").notNull(),
  transaction_pnl_cents: integer("transaction_pnl_cents").notNull(),
  return_1pr: integer("return_1pr").notNull(),
  price_return_1pr: integer("price_return_1pr").notNull(),
  fx_return_1pr: integer("fx_return_1pr").notNull(),
  position_basis_cents: integer("position_basis_cents").notNull(),
  holdings_count: integer("holdings_count").notNull(),
  cards_count: integer("cards_count").notNull(),
  computed_at: integer("computed_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type DailyPerformance = typeof dailyPerformance.$inferSelect;
export type NewDailyPerformance = typeof dailyPerformance.$inferInsert;

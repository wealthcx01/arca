import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createId } from "../../src/lib/nanoid";

export const portfolios = sqliteTable("portfolios", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  user_id: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  base_currency: text("base_currency").notNull().default("GBP"),
  created_at: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updated_at: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  deleted_at: integer("deleted_at", { mode: "timestamp_ms" }),
});

export const transactions = sqliteTable("transactions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  portfolio_id: text("portfolio_id").notNull(),
  card_id: text("card_id").notNull(),
  type: text("type").notNull(), // 'BUY' or 'SELL'
  quantity: integer("quantity").notNull(),
  price_cents: integer("price_cents").notNull(),
  currency: text("currency").notNull(),
  trade_date: integer("trade_date", { mode: "timestamp_ms" }).notNull(),
  shipping_cents: integer("shipping_cents").default(0),
  fees_cents: integer("fees_cents").default(0),
  taxes_cents: integer("taxes_cents").default(0),
  condition: text("condition").default("NM"),
  is_graded: integer("is_graded", { mode: "boolean" }).default(false),
  grading_company: text("grading_company"),
  grade: text("grade"),
  cert_number: text("cert_number"),
  notes: text("notes"),
  source: text("source").default("manual"),
  created_at: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const holdings = sqliteTable("holdings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  portfolio_id: text("portfolio_id").notNull(),
  card_id: text("card_id").notNull(),
  quantity: integer("quantity").notNull(),
  avg_cost_cents: integer("avg_cost_cents").notNull(),
  total_cost_basis_cents: integer("total_cost_basis_cents").notNull(),
  currency: text("currency").notNull(),
  condition: text("condition"),
  is_graded: integer("is_graded", { mode: "boolean" }).default(false),
  grading_company: text("grading_company"),
  grade: text("grade"),
  cert_number: text("cert_number"),
  first_bought_at: integer("first_bought_at", { mode: "timestamp_ms" }),
  updated_at: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const certVerifications = sqliteTable("cert_verifications", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  cert_number: text("cert_number").notNull().unique(),
  grading_company: text("grading_company").notNull(),
  card_name: text("card_name"),
  grade: text("grade"),
  year: text("year"),
  brand: text("brand"),
  variety: text("variety"),
  population: integer("population"),
  status: text("status").notNull(),
  raw_response: text("raw_response"),
  verified_at: integer("verified_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Portfolio = typeof portfolios.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Holding = typeof holdings.$inferSelect;

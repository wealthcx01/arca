import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createId } from "../../src/lib/nanoid.ts";

export const watchlists = sqliteTable("watchlists", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  user_id: text("user_id").notNull(),
  name: text("name").notNull(),
  sort_order: integer("sort_order").notNull().default(0),
  created_at: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updated_at: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const watchlistItems = sqliteTable("watchlist_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  watchlist_id: text("watchlist_id").notNull(),
  card_id: text("card_id").notNull(),
  sort_order: integer("sort_order").notNull().default(0),
  added_at: integer("added_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Watchlist = typeof watchlists.$inferSelect;
export type WatchlistItem = typeof watchlistItems.$inferSelect;

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createId } from "../../src/lib/nanoid";

export const cards = sqliteTable("cards", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  external_id: text("external_id").notNull().unique(),
  name: text("name").notNull(),
  set_name: text("set_name").notNull(),
  set_code: text("set_code").notNull(),
  card_number: text("card_number").notNull(),
  rarity: text("rarity"),
  image_url: text("image_url"),
  image_url_hires: text("image_url_hires"),
  supertype: text("supertype").notNull(),
  types: text("types"),
  hp: integer("hp"),
  artist: text("artist"),
  created_at: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;

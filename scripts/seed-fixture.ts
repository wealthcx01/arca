/**
 * Load the committed catalog fixture (ARCA-66).
 *
 *   bun run scripts/seed-fixture.ts
 *
 * ## Why this exists
 *
 * The browser suite needs a catalog: it navigates to `/cards`, picks a real card and asserts its
 * identity and artwork render. `db:seed` would provide one, and it calls the Pokémon TCG API — so a
 * gate built on it fails whenever someone else's service is slow, which is not a gate. (The same
 * reason ARCA-34's test job does not call it.)
 *
 * This inserts a small fixed set from `scripts/fixtures/cards.json` with no network at all.
 *
 * ## The artwork has to be served by us
 *
 * `CardDetailPage` swaps to the `ImageOff` placeholder on the `<img>`'s `onError`. A fixture
 * pointing at `images.pokemontcg.io` would therefore *fail the test* in CI — not because the code is
 * wrong, but because the image cannot be fetched. So `image_url` is built against a base the running
 * stack serves itself, defaulting to the dev/CI origin where `client/public/fixture-card.svg` lives.
 *
 * Idempotent: re-running updates the same rows rather than duplicating them, so it is safe to call
 * on a database that already has the fixture (or the real catalog) in it.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { cards } from "../modules/cards/schema";
import { cardPrices, gradedPrices } from "../modules/pricing/schema";

/** Where the running stack serves static files from. Overridable for a non-default port. */
const IMAGE_BASE = process.env.FIXTURE_IMAGE_BASE ?? "http://localhost:5173";

interface FixtureCard {
  external_id: string;
  name: string;
  set_name: string;
  set_code: string;
  card_number: string;
  rarity: string;
  supertype: string;
  types: string;
  hp: number;
  artist: string;
}

const file = join(import.meta.dir, "fixtures", "cards.json");
const fixtures: FixtureCard[] = JSON.parse(readFileSync(file, "utf8"));

if (fixtures.length === 0) {
  console.error("❌ scripts/fixtures/cards.json is empty — nothing to seed.");
  process.exit(1);
}

const db = getDb();
const image = `${IMAGE_BASE}/fixture-card.svg`;

let written = 0;
for (const card of fixtures) {
  db.insert(cards)
    .values({ ...card, image_url: image, image_url_hires: image })
    .onConflictDoUpdate({
      target: cards.external_id,
      set: {
        name: card.name,
        set_name: card.set_name,
        set_code: card.set_code,
        card_number: card.card_number,
        rarity: card.rarity,
        image_url: image,
        image_url_hires: image,
      },
    })
    .run();
  written += 1;
}

// ARCA-64: the card page's "last updated" labels need a real card_price/graded_price row to render
// against. The browser suite navigates straight to this fixture card and asserts a freshness label
// is visible — without this, the pricing panels never mount and that assertion always fails, for a
// reason that has nothing to do with the freshness feature itself. Re-run-safe like the card loop
// above: update in place rather than insert a duplicate row each time.
const priceFixtureCard = db
  .select({ id: cards.id })
  .from(cards)
  .where(eq(cards.external_id, "fixture-base1-1"))
  .get();

if (priceFixtureCard) {
  const now = new Date();
  const cardId = priceFixtureCard.id;

  const existingPrice = db
    .select({ id: cardPrices.id })
    .from(cardPrices)
    .where(
      and(
        eq(cardPrices.card_id, cardId),
        eq(cardPrices.source, "tcgplayer"),
        eq(cardPrices.variant, "holofoil"),
      ),
    )
    .get();
  const priceValues = {
    market_price_cents: 42000,
    low_price_cents: 35000,
    mid_price_cents: 40000,
    high_price_cents: 50000,
    currency: "USD",
    fetched_at: now,
  };
  if (existingPrice) {
    db.update(cardPrices).set(priceValues).where(eq(cardPrices.id, existingPrice.id)).run();
  } else {
    db.insert(cardPrices)
      .values({ card_id: cardId, source: "tcgplayer", variant: "holofoil", ...priceValues })
      .run();
  }

  const existingGraded = db
    .select({ id: gradedPrices.id })
    .from(gradedPrices)
    .where(
      and(
        eq(gradedPrices.card_id, cardId),
        eq(gradedPrices.grading_company, "PSA"),
        eq(gradedPrices.grade, "10"),
      ),
    )
    .get();
  const gradedValues = {
    price_cents: 150000,
    currency: "USD",
    sale_type: "market",
    fetched_at: now,
  };
  if (existingGraded) {
    db.update(gradedPrices).set(gradedValues).where(eq(gradedPrices.id, existingGraded.id)).run();
  } else {
    db.insert(gradedPrices)
      .values({
        card_id: cardId,
        source: "pricecharting",
        grading_company: "PSA",
        grade: "10",
        ...gradedValues,
      })
      .run();
  }
}

// Count rather than trust the loop: a silent zero here is the failure db/seed.ts was fixed for in
// ARCA-44, and a browser suite that runs against an empty catalog fails in a way nobody can read.
const counted = db
  .select({ total: sql<number>`count(*)`.as("total") })
  .from(cards)
  .all();
const total = counted[0]?.total ?? 0;

if (total === 0) {
  console.error("❌ Fixture seed wrote nothing — the catalog is still empty.");
  process.exit(1);
}

console.log(`✅ Fixture catalog ready: ${written} written, ${total} card(s) in the database.`);
console.log(`   Artwork: ${image}`);

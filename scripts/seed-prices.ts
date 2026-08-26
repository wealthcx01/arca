/**
 * Seed pricing data for ALL cards in the database.
 *
 * 1. Fetches real prices from TCGdex (free, no key) for every card.
 * 2. Generates 30 days of synthetic price history (random walk from current price).
 * 3. Generates graded price tiers (PSA 10/9/8, CGC 9.5/9, BGS 10) for priced cards.
 * 4. Runs conflation to mark best prices.
 *
 * Usage: bun run scripts/seed-prices.ts
 */

import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db/index.ts";
import { cards } from "../modules/cards/schema.ts";
import { conflate } from "../modules/pricing/conflation.ts";
import { updateProviderStatus } from "../modules/pricing/jobs.ts";
import type { PriceResult } from "../modules/pricing/providers/types.ts";
import { cardPrices, gradedPrices, priceHistory } from "../modules/pricing/schema.ts";
import { createId } from "../src/lib/nanoid.ts";

const TCGDEX_BASE = "https://api.tcgdex.net/v2/en";
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 400;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toCents(value: number | undefined | null): number | null {
  if (value == null) return null;
  return Math.round(value * 100);
}

/** Random walk: add gaussian-ish noise to a price (in cents). */
function jitter(cents: number, volatility = 0.03): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const change = cents * volatility * z;
  return Math.max(1, Math.round(cents + change));
}

// ---------------------------------------------------------------------------
// Step 1: Fetch real prices from TCGdex
// ---------------------------------------------------------------------------

interface TcgPlayerVariant {
  marketPrice?: number;
  lowPrice?: number;
  midPrice?: number;
  highPrice?: number;
}

interface TcgdexCard {
  id: string;
  pricing?: {
    cardmarket?: {
      avg?: number;
      low?: number;
      trend?: number;
      avg1?: number;
    };
    tcgplayer?: {
      normal?: TcgPlayerVariant;
      holofoil?: TcgPlayerVariant;
      reverseHolofoil?: TcgPlayerVariant;
      [key: string]: TcgPlayerVariant | string | undefined;
    };
  };
}

async function fetchTcgdexCard(externalId: string): Promise<TcgdexCard | null> {
  try {
    const res = await fetch(`${TCGDEX_BASE}/cards/${externalId}`);
    if (!res.ok) return null;
    return (await res.json()) as TcgdexCard;
  } catch {
    return null;
  }
}

async function fetchAllPrices(
  allCards: { id: string; external_id: string; name: string }[],
): Promise<PriceResult[]> {
  const results: PriceResult[] = [];
  let fetched = 0;
  let priced = 0;

  for (let i = 0; i < allCards.length; i += BATCH_SIZE) {
    const batch = allCards.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (card) => {
        const data = await fetchTcgdexCard(card.external_id);
        if (!data?.pricing) return [];

        const cardResults: PriceResult[] = [];
        const tp = data.pricing.tcgplayer;
        const cm = data.pricing.cardmarket;

        // TCGPlayer USD prices (preferred)
        if (tp) {
          const variantMap: Record<string, string> = {
            normal: "normal",
            holofoil: "holofoil",
            reverseHolofoil: "reverseHolofoil",
          };
          for (const [key, variant] of Object.entries(variantMap)) {
            const v = tp[key];
            if (!v || typeof v === "string") continue;
            cardResults.push({
              card_id: card.id,
              source: "tcgdex",
              variant,
              currency: "USD",
              market_price_cents: toCents(v.marketPrice),
              low_price_cents: toCents(v.lowPrice),
              mid_price_cents: toCents(v.midPrice),
              high_price_cents: toCents(v.highPrice),
            });
          }
        }

        // CardMarket EUR prices (secondary)
        if (cm && (cm.avg != null || cm.low != null || cm.trend != null)) {
          cardResults.push({
            card_id: card.id,
            source: "tcgdex",
            variant: "normal",
            currency: "EUR",
            market_price_cents: toCents(cm.trend),
            low_price_cents: toCents(cm.low),
            mid_price_cents: toCents(cm.avg),
            high_price_cents: toCents(cm.avg1),
          });
        }

        return cardResults;
      }),
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        results.push(...r.value);
        if (r.value.length > 0) priced++;
      }
    }

    fetched += batch.length;
    process.stdout.write(`\r  Fetched ${fetched}/${allCards.length} cards (${priced} priced)`);

    if (i + BATCH_SIZE < allCards.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log();
  return results;
}

// ---------------------------------------------------------------------------
// Step 2: Persist prices + generate history
// ---------------------------------------------------------------------------

function persistAndGenerateHistory(results: PriceResult[]): void {
  const db = getDb();
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const HISTORY_DAYS = 30;

  console.log(`  Persisting ${results.length} price records...`);

  for (const price of results) {
    // Upsert card_prices
    const existing = db
      .select({ id: cardPrices.id })
      .from(cardPrices)
      .where(
        and(
          eq(cardPrices.card_id, price.card_id),
          eq(cardPrices.source, price.source),
          eq(cardPrices.variant, price.variant),
          eq(cardPrices.currency, price.currency),
        ),
      )
      .get();

    if (existing) {
      db.update(cardPrices)
        .set({
          market_price_cents: price.market_price_cents,
          low_price_cents: price.low_price_cents,
          mid_price_cents: price.mid_price_cents,
          high_price_cents: price.high_price_cents,
          conflated_rank: 0,
          fetched_at: new Date(),
        })
        .where(eq(cardPrices.id, existing.id))
        .run();
    } else {
      db.insert(cardPrices)
        .values({
          card_id: price.card_id,
          source: price.source,
          market_price_cents: price.market_price_cents,
          low_price_cents: price.low_price_cents,
          mid_price_cents: price.mid_price_cents,
          high_price_cents: price.high_price_cents,
          currency: price.currency,
          variant: price.variant,
          conflated_rank: 0,
          fetched_at: new Date(),
        })
        .run();
    }

    // Generate synthetic price history (random walk backwards from current price)
    const basePrice = price.market_price_cents ?? price.mid_price_cents;
    if (basePrice && basePrice > 0) {
      let walkPrice = basePrice;

      for (let day = HISTORY_DAYS; day >= 1; day--) {
        // Walk backwards: each earlier day is the current day's price with jitter
        walkPrice = jitter(walkPrice, 0.025);
        const recordedAt = new Date(now - day * DAY_MS);

        db.insert(priceHistory)
          .values({
            card_id: price.card_id,
            source: price.source,
            market_price_cents: walkPrice,
            mid_price_cents: price.mid_price_cents ? jitter(price.mid_price_cents, 0.02) : null,
            currency: price.currency,
            variant: price.variant,
            recorded_at: recordedAt,
          })
          .run();
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Step 3: Generate graded prices
// ---------------------------------------------------------------------------

function generateGradedPrices(): void {
  const db = getDb();

  // Get all cards with a conflated price (rank=1, USD)
  const pricedCards = db
    .select({
      card_id: cardPrices.card_id,
      market_price_cents: cardPrices.market_price_cents,
    })
    .from(cardPrices)
    .where(and(eq(cardPrices.conflated_rank, 1), eq(cardPrices.currency, "USD")))
    .all()
    .filter((c) => c.market_price_cents && c.market_price_cents > 500); // Only cards > $5

  console.log(`  Generating graded prices for ${pricedCards.length} cards...`);

  const grades: { company: string; grade: string; multiplier: number }[] = [
    { company: "PSA", grade: "10", multiplier: 3.5 },
    { company: "PSA", grade: "9", multiplier: 1.8 },
    { company: "PSA", grade: "8", multiplier: 1.3 },
    { company: "CGC", grade: "9.5", multiplier: 2.8 },
    { company: "CGC", grade: "9", multiplier: 1.6 },
    { company: "BGS", grade: "10", multiplier: 4.0 },
    { company: "BGS", grade: "9.5", multiplier: 2.5 },
  ];

  for (const card of pricedCards) {
    const rawPrice = card.market_price_cents!;

    for (const g of grades) {
      // Add some randomness to the multiplier
      const mult = g.multiplier * (0.85 + Math.random() * 0.3);
      const gradedPrice = Math.round(rawPrice * mult);

      const existing = db
        .select({ id: gradedPrices.id })
        .from(gradedPrices)
        .where(
          and(
            eq(gradedPrices.card_id, card.card_id),
            eq(gradedPrices.grading_company, g.company),
            eq(gradedPrices.grade, g.grade),
          ),
        )
        .get();

      if (existing) {
        db.update(gradedPrices)
          .set({ price_cents: gradedPrice, fetched_at: new Date() })
          .where(eq(gradedPrices.id, existing.id))
          .run();
      } else {
        db.insert(gradedPrices)
          .values({
            card_id: card.card_id,
            source: "seed",
            grading_company: g.company,
            grade: g.grade,
            price_cents: gradedPrice,
            currency: "USD",
            sale_type: "market",
            fetched_at: new Date(),
          })
          .run();
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Step 4: Run conflation
// ---------------------------------------------------------------------------

function runConflation(): void {
  const db = getDb();

  // Get all unique card IDs with prices
  const cardIds = db
    .select({ card_id: cardPrices.card_id })
    .from(cardPrices)
    .groupBy(cardPrices.card_id)
    .all()
    .map((r) => r.card_id);

  console.log(`  Running conflation for ${cardIds.length} cards...`);

  // Reset all ranks
  db.update(cardPrices).set({ conflated_rank: 0 }).run();

  // Gather all prices
  const allPrices: PriceResult[] = [];
  for (const cardId of cardIds) {
    const rows = db.select().from(cardPrices).where(eq(cardPrices.card_id, cardId)).all();
    for (const row of rows) {
      allPrices.push({
        card_id: row.card_id,
        source: row.source,
        variant: row.variant,
        currency: row.currency,
        market_price_cents: row.market_price_cents,
        low_price_cents: row.low_price_cents,
        mid_price_cents: row.mid_price_cents,
        high_price_cents: row.high_price_cents,
      });
    }
  }

  const conflated = conflate(allPrices);

  for (const cp of conflated) {
    const bestSource = cp.market_source ?? cp.mid_source ?? cp.low_source ?? cp.high_source;
    if (!bestSource) continue;

    // For conflation, prefer USD rows
    const row = db
      .select({ id: cardPrices.id })
      .from(cardPrices)
      .where(
        and(
          eq(cardPrices.card_id, cp.card_id),
          eq(cardPrices.source, bestSource),
          eq(cardPrices.variant, cp.variant),
          eq(cardPrices.currency, "USD"),
        ),
      )
      .get();

    if (row) {
      db.update(cardPrices).set({ conflated_rank: 1 }).where(eq(cardPrices.id, row.id)).run();
    } else {
      // Fall back to any currency
      const fallback = db
        .select({ id: cardPrices.id })
        .from(cardPrices)
        .where(
          and(
            eq(cardPrices.card_id, cp.card_id),
            eq(cardPrices.source, bestSource),
            eq(cardPrices.variant, cp.variant),
          ),
        )
        .get();

      if (fallback) {
        db.update(cardPrices)
          .set({ conflated_rank: 1 })
          .where(eq(cardPrices.id, fallback.id))
          .run();
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== ARCA Price Seeder ===\n");

  const db = getDb();

  // Get all cards
  const allCards = db
    .select({ id: cards.id, external_id: cards.external_id, name: cards.name })
    .from(cards)
    .all();

  console.log(`Found ${allCards.length} cards in database.\n`);

  // Step 1: Fetch real prices from TCGdex
  console.log("Step 1: Fetching prices from TCGdex...");
  const prices = await fetchAllPrices(allCards);
  console.log(`  Got ${prices.length} price records.\n`);

  if (prices.length === 0) {
    console.log("No prices fetched. Check your network connection.");
    process.exit(1);
  }

  // Step 2: Persist prices and generate history
  console.log("Step 2: Persisting prices + generating 30-day history...");
  persistAndGenerateHistory(prices);
  updateProviderStatus("tcgdex", "ok", prices.length, null);
  console.log("  Done.\n");

  // Step 3: Run conflation (needed before graded prices)
  console.log("Step 3: Running conflation...");
  runConflation();
  console.log("  Done.\n");

  // Step 4: Generate graded prices
  console.log("Step 4: Generating graded prices...");
  generateGradedPrices();
  console.log("  Done.\n");

  // Summary
  const priceCount = db.select({ c: sql<number>`COUNT(*)` }).from(cardPrices).get();
  const historyCount = db.select({ c: sql<number>`COUNT(*)` }).from(priceHistory).get();
  const gradedCount = db.select({ c: sql<number>`COUNT(*)` }).from(gradedPrices).get();
  const conflatedCount = db
    .select({ c: sql<number>`COUNT(*)` })
    .from(cardPrices)
    .where(eq(cardPrices.conflated_rank, 1))
    .get();

  console.log("=== Seed Complete ===");
  console.log(`  Card prices:     ${priceCount?.c ?? 0}`);
  console.log(`  Conflated (rank=1): ${conflatedCount?.c ?? 0}`);
  console.log(`  Price history:   ${historyCount?.c ?? 0}`);
  console.log(`  Graded prices:   ${gradedCount?.c ?? 0}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

/**
 * Multi-provider pricing orchestrator.
 * Replaces the single-source Pokemon TCG API sync with a multi-provider pipeline.
 *
 * Free providers run every 6h, BYOK providers every 12h.
 * After all providers have fetched, the conflation engine picks best prices.
 */

import { and, eq } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import { decrypt } from "../../src/lib/crypto.ts";
import { scheduler } from "../../src/lib/scheduler.ts";
import { cards } from "../cards/schema.ts";
import { holdings } from "../portfolio/schema.ts";
import { conflate } from "./conflation.ts";
import { getByokProviders, getFreeProviders } from "./providers/registry.ts";
import type { CardRef, GradedPriceResult, PriceResult, ProviderConfig } from "./providers/types.ts";
import {
  cardPrices,
  fxRates,
  gradedPrices,
  priceHistory,
  priceSourceStatus,
  userApiKeys,
} from "./schema.ts";

// Import providers to register them
import "./providers/index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Get all unique cards from holdings, enriched with card metadata. */
function getHeldCardRefs(): CardRef[] {
  const db = getDb();
  const rows = db
    .select({
      id: holdings.card_id,
      external_id: cards.external_id,
      name: cards.name,
      set_code: cards.set_code,
      set_name: cards.set_name,
    })
    .from(holdings)
    .innerJoin(cards, eq(holdings.card_id, cards.id))
    .all();

  // Deduplicate by card id
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

/** Update provider status in the database. */
export function updateProviderStatus(
  provider: string,
  status: string,
  cardsSynced: number,
  error: string | null,
): void {
  const db = getDb();
  const now = new Date();

  const existing = db
    .select({ id: priceSourceStatus.id })
    .from(priceSourceStatus)
    .where(eq(priceSourceStatus.provider, provider))
    .get();

  if (existing) {
    db.update(priceSourceStatus)
      .set({
        status,
        cards_synced: cardsSynced,
        last_error: error,
        last_sync_at: now,
        updated_at: now,
      })
      .where(eq(priceSourceStatus.id, existing.id))
      .run();
  } else {
    db.insert(priceSourceStatus)
      .values({
        provider,
        status,
        cards_synced: cardsSynced,
        last_error: error,
        last_sync_at: now,
        updated_at: now,
      })
      .run();
  }
}

/** Persist price results to card_prices table (upsert by card_id + source + variant). */
function persistPrices(results: PriceResult[]): void {
  const db = getDb();
  const now = new Date();

  for (const price of results) {
    const existing = db
      .select({ id: cardPrices.id })
      .from(cardPrices)
      .where(
        and(
          eq(cardPrices.card_id, price.card_id),
          eq(cardPrices.source, price.source),
          eq(cardPrices.variant, price.variant),
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
          currency: price.currency,
          conflated_rank: 0, // Reset; conflation pass sets this
          fetched_at: now,
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
          fetched_at: now,
        })
        .run();
    }

    // Snapshot to price_history
    db.insert(priceHistory)
      .values({
        card_id: price.card_id,
        source: price.source,
        market_price_cents: price.market_price_cents,
        mid_price_cents: price.mid_price_cents,
        currency: price.currency,
        variant: price.variant,
        recorded_at: now,
      })
      .run();
  }
}

/** Persist graded price results to graded_prices table. */
function persistGradedPrices(results: GradedPriceResult[]): void {
  const db = getDb();
  const now = new Date();

  for (const gp of results) {
    // Upsert by card_id + source + grading_company + grade
    const existing = db
      .select({ id: gradedPrices.id })
      .from(gradedPrices)
      .where(
        and(
          eq(gradedPrices.card_id, gp.card_id),
          eq(gradedPrices.source, gp.source),
          eq(gradedPrices.grading_company, gp.grading_company),
          eq(gradedPrices.grade, gp.grade),
        ),
      )
      .get();

    if (existing) {
      db.update(gradedPrices)
        .set({
          price_cents: gp.price_cents,
          currency: gp.currency,
          sale_type: gp.sale_type,
          fetched_at: now,
        })
        .where(eq(gradedPrices.id, existing.id))
        .run();
    } else {
      db.insert(gradedPrices)
        .values({
          card_id: gp.card_id,
          source: gp.source,
          grading_company: gp.grading_company,
          grade: gp.grade,
          price_cents: gp.price_cents,
          currency: gp.currency,
          sale_type: gp.sale_type,
          fetched_at: now,
        })
        .run();
    }
  }
}

/** Run conflation and mark winners with conflated_rank = 1. */
function runConflation(cardIds: string[]): void {
  const db = getDb();

  // Reset all conflated_rank for these cards
  for (const cardId of cardIds) {
    db.update(cardPrices).set({ conflated_rank: 0 }).where(eq(cardPrices.card_id, cardId)).run();
  }

  // Gather all current prices for these cards
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

  // For each conflated result, find the best overall source row and mark it rank=1
  for (const cp of conflated) {
    // The primary source is the market_source (highest priority)
    const bestSource = cp.market_source ?? cp.mid_source ?? cp.low_source ?? cp.high_source;
    if (!bestSource) continue;

    const row = db
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

    if (row) {
      db.update(cardPrices).set({ conflated_rank: 1 }).where(eq(cardPrices.id, row.id)).run();
    }
  }
}

// ---------------------------------------------------------------------------
// syncPrices — Multi-provider orchestrator
// ---------------------------------------------------------------------------

export async function syncPrices(): Promise<void> {
  console.log("[pricing:sync] Starting multi-provider price sync...");

  const cardRefs = getHeldCardRefs();
  if (cardRefs.length === 0) {
    console.log("[pricing:sync] No holdings found, skipping.");
    return;
  }

  console.log(`[pricing:sync] Syncing prices for ${cardRefs.length} cards...`);

  const allResults: PriceResult[] = [];
  const allGradedResults: GradedPriceResult[] = [];

  // Run free providers
  const freeProviders = getFreeProviders();
  for (const provider of freeProviders) {
    updateProviderStatus(provider.name, "syncing", 0, null);
    try {
      console.log(`[pricing:sync] Fetching from ${provider.displayName}...`);
      const prices = await provider.fetchPrices(cardRefs, {});
      allResults.push(...prices);
      updateProviderStatus(provider.name, "ok", prices.length, null);
      console.log(`[pricing:sync] ${provider.displayName}: ${prices.length} prices`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[pricing:sync] ${provider.displayName} failed:`, errMsg);
      updateProviderStatus(provider.name, "error", 0, errMsg);
    }
  }

  // Run BYOK providers (for all users that have active keys)
  const db = getDb();
  const byokProviders = getByokProviders();

  for (const provider of byokProviders) {
    const activeKeys = db
      .select()
      .from(userApiKeys)
      .where(and(eq(userApiKeys.provider, provider.name), eq(userApiKeys.is_active, true)))
      .all();

    if (activeKeys.length === 0) continue;

    // Use first active key (multi-user: would need per-user handling)
    const keyRow = activeKeys[0]!;
    updateProviderStatus(provider.name, "syncing", 0, null);

    try {
      const decryptedKey = await decrypt(keyRow.encrypted_key);
      const config: ProviderConfig = { apiKey: decryptedKey };

      console.log(`[pricing:sync] Fetching from ${provider.displayName} (BYOK)...`);
      const prices = await provider.fetchPrices(cardRefs, config);
      allResults.push(...prices);

      // Graded prices if supported
      if (provider.fetchGradedPrices) {
        const graded = await provider.fetchGradedPrices(cardRefs, config);
        allGradedResults.push(...graded);
        console.log(`[pricing:sync] ${provider.displayName}: ${graded.length} graded prices`);
      }

      // Update usage
      db.update(userApiKeys)
        .set({
          daily_usage: keyRow.daily_usage + cardRefs.length,
          last_used_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(userApiKeys.id, keyRow.id))
        .run();

      updateProviderStatus(provider.name, "ok", prices.length, null);
      console.log(`[pricing:sync] ${provider.displayName}: ${prices.length} prices`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[pricing:sync] ${provider.displayName} failed:`, errMsg);
      updateProviderStatus(provider.name, "error", 0, errMsg);
    }
  }

  // Persist all results
  if (allResults.length > 0) {
    console.log(`[pricing:sync] Persisting ${allResults.length} price results...`);
    persistPrices(allResults);
  }

  if (allGradedResults.length > 0) {
    console.log(`[pricing:sync] Persisting ${allGradedResults.length} graded price results...`);
    persistGradedPrices(allGradedResults);
  }

  // Run conflation pass
  const uniqueCardIds = [...new Set(allResults.map((r) => r.card_id))];
  if (uniqueCardIds.length > 0) {
    console.log(`[pricing:sync] Running conflation for ${uniqueCardIds.length} cards...`);
    runConflation(uniqueCardIds);
  }

  console.log(
    `[pricing:sync] Multi-provider sync complete. ${allResults.length} prices from ${freeProviders.length + byokProviders.length} providers.`,
  );
}

// ---------------------------------------------------------------------------
// syncFxRates — Fetch latest FX rates from Frankfurter API
// ---------------------------------------------------------------------------

interface FrankfurterResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export async function syncFxRates(): Promise<void> {
  const db = getDb();

  console.log("[pricing:fx] Starting FX rate sync...");

  const response = await fetch(
    "https://api.frankfurter.app/latest?from=USD&to=GBP,EUR,SGD,HKD,JPY",
  );

  if (!response.ok) {
    throw new Error(`Frankfurter API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as FrankfurterResponse;
  const now = new Date();

  for (const [quoteCurrency, rate] of Object.entries(data.rates)) {
    const rateInt = Math.round(rate * 1_000_000);

    // Upsert forward rate: USD -> quoteCurrency
    const existingForward = db
      .select({ id: fxRates.id })
      .from(fxRates)
      .where(and(eq(fxRates.base, "USD"), eq(fxRates.quote, quoteCurrency)))
      .get();

    if (existingForward) {
      db.update(fxRates)
        .set({ rate: rateInt, fetched_at: now })
        .where(eq(fxRates.id, existingForward.id))
        .run();
    } else {
      db.insert(fxRates)
        .values({
          base: "USD",
          quote: quoteCurrency,
          rate: rateInt,
          fetched_at: now,
        })
        .run();
    }

    // Upsert reverse rate: quoteCurrency -> USD
    const reverseRateInt = rate > 0 ? Math.round((1 / rate) * 1_000_000) : 1_000_000;

    const existingReverse = db
      .select({ id: fxRates.id })
      .from(fxRates)
      .where(and(eq(fxRates.base, quoteCurrency), eq(fxRates.quote, "USD")))
      .get();

    if (existingReverse) {
      db.update(fxRates)
        .set({ rate: reverseRateInt, fetched_at: now })
        .where(eq(fxRates.id, existingReverse.id))
        .run();
    } else {
      db.insert(fxRates)
        .values({
          base: quoteCurrency,
          quote: "USD",
          rate: reverseRateInt,
          fetched_at: now,
        })
        .run();
    }
  }

  console.log(
    `[pricing:fx] FX rate sync complete. ${Object.keys(data.rates).length} pairs updated.`,
  );
}

// ---------------------------------------------------------------------------
// Register jobs with the scheduler
// ---------------------------------------------------------------------------

export function registerPricingJobs(): void {
  // Multi-provider sync every 6 hours
  scheduler.register("pricing:sync-prices", syncPrices, 6 * 60 * 60 * 1000);

  // FX rates every 24 hours
  scheduler.register("pricing:sync-fx-rates", syncFxRates, 24 * 60 * 60 * 1000);
}

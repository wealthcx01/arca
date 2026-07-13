/**
 * Conflation engine — LSEG-inspired field-level best-price selection.
 *
 * For each card+variant, picks the best source per price field:
 * - market_price_cents: Priority order (tcgplayer > ebay > cardmarket)
 * - low_price_cents: MIN across all sources
 * - mid_price_cents: Priority order (tcgplayer > cardmarket > any)
 * - high_price_cents: MAX across all sources
 *
 * Source attribution tracked per field (like LSEG CF_SOURCE).
 */

import type { ConflatedPrice, PriceResult } from "./providers/types";

/** Source priority for market prices (higher index = higher priority). */
const MARKET_PRIORITY: Record<string, number> = {
  cardmarket: 1,
  tcgdex: 1,
  pricecharting: 2,
  "pokemon-price-tracker:ebay": 3,
  "poketrace:ebay": 3,
  tcgcsv: 4,
  tcgplayer: 5,
  "pokemon-price-tracker": 5,
  "poketrace:tcgplayer": 5,
};

/** Source priority for mid prices. */
const MID_PRIORITY: Record<string, number> = {
  cardmarket: 2,
  tcgdex: 2,
  pricecharting: 3,
  tcgcsv: 4,
  tcgplayer: 5,
  "pokemon-price-tracker": 5,
  "poketrace:tcgplayer": 5,
};

function getPriority(source: string, table: Record<string, number>): number {
  return table[source] ?? 0;
}

/**
 * Conflate multiple price results for the same card into best-price selections.
 * Groups by card_id + variant, then picks best per field.
 */
export function conflate(prices: PriceResult[]): ConflatedPrice[] {
  // Group by card_id + variant
  const groups = new Map<string, PriceResult[]>();
  for (const price of prices) {
    const key = `${price.card_id}|${price.variant}`;
    const existing = groups.get(key) ?? [];
    existing.push(price);
    groups.set(key, existing);
  }

  const results: ConflatedPrice[] = [];

  for (const [key, groupPrices] of groups) {
    const [card_id, variant] = key.split("|") as [string, string];

    // Field: market_price_cents — pick highest priority source with a value
    let bestMarket: { cents: number; source: string } | null = null;
    for (const p of groupPrices) {
      if (p.market_price_cents != null) {
        const priority = getPriority(p.source, MARKET_PRIORITY);
        if (!bestMarket || priority > getPriority(bestMarket.source, MARKET_PRIORITY)) {
          bestMarket = { cents: p.market_price_cents, source: p.source };
        }
      }
    }

    // Field: low_price_cents — MIN across all sources
    let bestLow: { cents: number; source: string } | null = null;
    for (const p of groupPrices) {
      if (p.low_price_cents != null) {
        if (!bestLow || p.low_price_cents < bestLow.cents) {
          bestLow = { cents: p.low_price_cents, source: p.source };
        }
      }
    }

    // Field: mid_price_cents — pick highest priority source with a value
    let bestMid: { cents: number; source: string } | null = null;
    for (const p of groupPrices) {
      if (p.mid_price_cents != null) {
        const priority = getPriority(p.source, MID_PRIORITY);
        if (!bestMid || priority > getPriority(bestMid.source, MID_PRIORITY)) {
          bestMid = { cents: p.mid_price_cents, source: p.source };
        }
      }
    }

    // Field: high_price_cents — MAX across all sources
    let bestHigh: { cents: number; source: string } | null = null;
    for (const p of groupPrices) {
      if (p.high_price_cents != null) {
        if (!bestHigh || p.high_price_cents > bestHigh.cents) {
          bestHigh = { cents: p.high_price_cents, source: p.source };
        }
      }
    }

    results.push({
      card_id,
      variant,
      market_price_cents: bestMarket?.cents ?? null,
      market_source: bestMarket?.source ?? null,
      low_price_cents: bestLow?.cents ?? null,
      low_source: bestLow?.source ?? null,
      mid_price_cents: bestMid?.cents ?? null,
      mid_source: bestMid?.source ?? null,
      high_price_cents: bestHigh?.cents ?? null,
      high_source: bestHigh?.source ?? null,
      currency: "USD", // All conflated prices normalized to USD
    });
  }

  return results;
}

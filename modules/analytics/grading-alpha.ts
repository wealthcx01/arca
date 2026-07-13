/**
 * Grading Alpha — ROI calculation for grading a raw card.
 *
 * alpha = (graded_price - raw_price - grading_cost) / raw_price
 *
 * Grading costs (USD cents):
 * PSA:  $25 bulk / $75 regular / $150 express
 * CGC:  $20 bulk / $50 regular / $100 express
 * BGS:  $30 bulk / $100 regular / $250 express
 *
 * Returns alpha per grade per company, stored in basis points.
 */

import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import { cardPrices, gradedPrices } from "../pricing/schema.ts";
import { cardAnalytics } from "./schema.ts";

const BP = 10_000;

/** Grading costs in cents (using "regular" tier). */
const GRADING_COSTS: Record<string, number> = {
  PSA: 7500, // $75
  CGC: 5000, // $50
  BGS: 10000, // $100
};

export interface GradingAlphaResult {
  card_id: string;
  grading_company: string;
  grade: string;
  raw_price_cents: number;
  graded_price_cents: number;
  grading_cost_cents: number;
  alpha_bp: number;
}

/**
 * Compute grading alpha for a single card across all grades/companies.
 */
export function computeGradingAlpha(cardId: string): GradingAlphaResult[] {
  const db = getDb();

  // Get raw price (conflated rank 1, USD)
  const rawPrice = db
    .select({ market_price_cents: cardPrices.market_price_cents })
    .from(cardPrices)
    .where(
      and(
        eq(cardPrices.card_id, cardId),
        eq(cardPrices.conflated_rank, 1),
        eq(cardPrices.currency, "USD"),
      ),
    )
    .get();

  const rawCents = rawPrice?.market_price_cents;
  if (!rawCents || rawCents <= 0) return [];

  // Get all graded prices for this card
  const graded = db
    .select({
      grading_company: gradedPrices.grading_company,
      grade: gradedPrices.grade,
      price_cents: gradedPrices.price_cents,
    })
    .from(gradedPrices)
    .where(eq(gradedPrices.card_id, cardId))
    .all();

  const results: GradingAlphaResult[] = [];

  for (const gp of graded) {
    const cost = GRADING_COSTS[gp.grading_company] ?? 7500;
    const alpha = ((gp.price_cents - rawCents - cost) / rawCents) * BP;

    results.push({
      card_id: cardId,
      grading_company: gp.grading_company,
      grade: gp.grade,
      raw_price_cents: rawCents,
      graded_price_cents: gp.price_cents,
      grading_cost_cents: cost,
      alpha_bp: Math.round(alpha),
    });
  }

  return results;
}

/**
 * Compute and store best grading alpha for all cards.
 */
export function computeAllGradingAlpha(): number {
  const db = getDb();

  // Get all cards that have both raw prices and graded prices
  const cardIds = db.all<{ card_id: string }>(sql`
    SELECT DISTINCT gp.card_id
    FROM graded_prices gp
    INNER JOIN card_prices cp ON gp.card_id = cp.card_id AND cp.conflated_rank = 1
    WHERE cp.market_price_cents > 0
  `);

  let count = 0;
  for (const { card_id } of cardIds) {
    const alphas = computeGradingAlpha(card_id);
    if (alphas.length === 0) continue;

    // Find best alpha
    const bestAlpha = Math.max(...alphas.map((a) => a.alpha_bp));

    // Update card_analytics with best grading alpha
    db.update(cardAnalytics)
      .set({ grading_alpha_bp: bestAlpha, updated_at: new Date() })
      .where(eq(cardAnalytics.card_id, card_id))
      .run();

    count++;
  }

  return count;
}

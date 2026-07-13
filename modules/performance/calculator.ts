import { and, desc, eq, lte } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import { holdings } from "../portfolio/schema.ts";
import { cardPrices, fxRates } from "../pricing/schema.ts";
import { dailyPerformance } from "./schema.ts";

const RETURN_PRECISION = 1_000_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the latest market price for a card in cents.
 * Prefers market_price_cents, falls back to mid_price_cents.
 */
function getLatestPrice(cardId: string): number {
  const db = getDb();
  const price = db
    .select()
    .from(cardPrices)
    .where(eq(cardPrices.card_id, cardId))
    .orderBy(desc(cardPrices.fetched_at))
    .limit(1)
    .get();

  return price?.market_price_cents ?? price?.mid_price_cents ?? 0;
}

/**
 * Get FX rate for converting from one currency to another.
 * Returns rate as integer (rate * 1_000_000).
 * If same currency, returns 1_000_000.
 */
function getFxRate(fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return RETURN_PRECISION;

  const db = getDb();
  const rate = db
    .select()
    .from(fxRates)
    .where(and(eq(fxRates.base, fromCurrency), eq(fxRates.quote, toCurrency)))
    .orderBy(desc(fxRates.fetched_at))
    .limit(1)
    .get();

  return rate?.rate ?? RETURN_PRECISION;
}

// ---------------------------------------------------------------------------
// Core calculation
// ---------------------------------------------------------------------------

/**
 * Compute daily performance for a portfolio on a given date.
 *
 * - Looks up the previous day's EOD value as BOD value
 * - Computes current EOD value from holdings * latest prices * FX
 * - Calculates P&L and returns as (1+r) * 1_000_000
 * - Upserts the daily_performance record for the given date
 */
export async function computeDailyPerformance(
  portfolioId: string,
  date: Date,
  baseCurrency: string,
): Promise<void> {
  const db = getDb();
  const dateMs = date.getTime();

  // Get previous day's performance for BOD value
  const prevPerf = db
    .select()
    .from(dailyPerformance)
    .where(
      and(
        eq(dailyPerformance.portfolio_id, portfolioId),
        lte(dailyPerformance.date, new Date(dateMs - 86_400_000)),
      ),
    )
    .orderBy(desc(dailyPerformance.date))
    .limit(1)
    .get();

  const bodCents = prevPerf?.mktvalue_eod_cents ?? 0;

  // Get current holdings and compute EOD value
  const currentHoldings = db
    .select()
    .from(holdings)
    .where(eq(holdings.portfolio_id, portfolioId))
    .all();

  let eodCents = 0;
  let holdingsCount = 0;
  let cardsCount = 0;

  for (const h of currentHoldings) {
    const priceCents = getLatestPrice(h.card_id);
    const fxRate = getFxRate(h.currency, baseCurrency);
    const valueCents = Math.round((h.quantity * priceCents * fxRate) / RETURN_PRECISION);
    eodCents += valueCents;
    holdingsCount++;
    cardsCount += h.quantity;
  }

  // P&L calculations
  const pnlCents = eodCents - bodCents;
  const pricePnlCents = pnlCents; // Simplified: attribute all to price for now
  const fxPnlCents = 0;
  const transactionPnlCents = 0;

  // Return calculation: (1 + r) * RETURN_PRECISION
  const positionBasis = bodCents || 1; // Avoid division by zero
  const return1pr =
    bodCents > 0 ? Math.round((1 + pnlCents / positionBasis) * RETURN_PRECISION) : RETURN_PRECISION;

  // Delete existing entry for this portfolio+date
  const existing = db
    .select()
    .from(dailyPerformance)
    .where(and(eq(dailyPerformance.portfolio_id, portfolioId), eq(dailyPerformance.date, date)))
    .all();

  for (const e of existing) {
    db.delete(dailyPerformance).where(eq(dailyPerformance.id, e.id)).run();
  }

  // Insert performance record
  db.insert(dailyPerformance)
    .values({
      portfolio_id: portfolioId,
      date,
      mktvalue_bod_cents: bodCents,
      mktvalue_eod_cents: eodCents,
      pnl_cents: pnlCents,
      price_pnl_cents: pricePnlCents,
      fx_pnl_cents: fxPnlCents,
      transaction_pnl_cents: transactionPnlCents,
      return_1pr: return1pr,
      price_return_1pr: return1pr,
      fx_return_1pr: RETURN_PRECISION,
      position_basis_cents: positionBasis,
      holdings_count: holdingsCount,
      cards_count: cardsCount,
    })
    .run();
}

/**
 * OHLC generation — synthesizes daily OHLC bars from price_history.
 *
 * Uses recorded_at ordering within each day to determine open/close,
 * and min/max across all sources for high/low.
 */

import { and, eq, gte, lt, sql } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import { cardPrices, priceHistory } from "../pricing/schema.ts";
import { cardOhlcDaily } from "./schema.ts";

interface OHLCRow {
  card_id: string;
  currency: string;
  date: string;
  open_cents: number;
  high_cents: number;
  low_cents: number;
  close_cents: number;
  source_count: number;
}

/**
 * Generate OHLC for a single card on a specific date.
 * Queries price_history for that day, produces O/H/L/C from recorded_at ordering.
 */
export function generateOHLC(cardId: string, currency: string, date: string): OHLCRow | null {
  const db = getDb();
  const dayStart = new Date(`${date}T00:00:00Z`).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;

  const rows = db
    .select({
      market_price_cents: priceHistory.market_price_cents,
      mid_price_cents: priceHistory.mid_price_cents,
      recorded_at: priceHistory.recorded_at,
    })
    .from(priceHistory)
    .where(
      and(
        eq(priceHistory.card_id, cardId),
        eq(priceHistory.currency, currency),
        gte(priceHistory.recorded_at, new Date(dayStart)),
        lt(priceHistory.recorded_at, new Date(dayEnd)),
      ),
    )
    .orderBy(priceHistory.recorded_at)
    .all();

  // Use market_price_cents, fall back to mid_price_cents
  const prices = rows
    .map((r) => r.market_price_cents ?? r.mid_price_cents)
    .filter((p): p is number => p != null && p > 0);

  if (prices.length === 0) return null;

  return {
    card_id: cardId,
    currency,
    date,
    open_cents: prices[0]!,
    high_cents: Math.max(...prices),
    low_cents: Math.min(...prices),
    close_cents: prices[prices.length - 1]!,
    source_count: prices.length,
  };
}

/**
 * Generate OHLC for all cards for a specific date.
 * If no price_history exists for a date, falls back to current card_prices.
 */
export function generateOHLCForDate(date: string): number {
  const db = getDb();
  const dayStart = new Date(`${date}T00:00:00Z`).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;

  // Find all distinct card_id + currency combos with history that day
  const combos = db.all<{ card_id: string; currency: string }>(sql`
    SELECT DISTINCT card_id, currency FROM price_history
    WHERE recorded_at >= ${dayStart} AND recorded_at < ${dayEnd}
      AND (market_price_cents IS NOT NULL OR mid_price_cents IS NOT NULL)
  `);

  // If no history for this date, fall back to current card_prices snapshot
  if (combos.length === 0) {
    return generateOHLCFromCurrentPrices(date);
  }

  let count = 0;
  for (const { card_id, currency } of combos) {
    const ohlc = generateOHLC(card_id, currency, date);
    if (!ohlc) continue;

    // Upsert: delete existing then insert
    db.delete(cardOhlcDaily)
      .where(
        and(
          eq(cardOhlcDaily.card_id, card_id),
          eq(cardOhlcDaily.currency, currency),
          eq(cardOhlcDaily.date, date),
        ),
      )
      .run();

    db.insert(cardOhlcDaily).values(ohlc).run();

    count++;
  }

  return count;
}

/**
 * Fallback: generate OHLC from current card_prices when no history exists.
 * Uses market/low/mid/high fields as OHLC proxy.
 */
function generateOHLCFromCurrentPrices(date: string): number {
  const db = getDb();

  // Get all conflated prices (rank 1)
  const prices = db
    .select({
      card_id: cardPrices.card_id,
      currency: cardPrices.currency,
      market_price_cents: cardPrices.market_price_cents,
      low_price_cents: cardPrices.low_price_cents,
      mid_price_cents: cardPrices.mid_price_cents,
      high_price_cents: cardPrices.high_price_cents,
    })
    .from(cardPrices)
    .where(eq(cardPrices.conflated_rank, 1))
    .all();

  let count = 0;
  for (const p of prices) {
    const close = p.market_price_cents ?? p.mid_price_cents;
    if (!close || close <= 0) continue;

    const open = p.mid_price_cents ?? close;
    const high = p.high_price_cents ?? close;
    const low = p.low_price_cents ?? close;

    db.delete(cardOhlcDaily)
      .where(
        and(
          eq(cardOhlcDaily.card_id, p.card_id),
          eq(cardOhlcDaily.currency, p.currency),
          eq(cardOhlcDaily.date, date),
        ),
      )
      .run();

    db.insert(cardOhlcDaily)
      .values({
        card_id: p.card_id,
        currency: p.currency,
        date,
        open_cents: open,
        high_cents: high,
        low_cents: low,
        close_cents: close,
        source_count: 1,
      })
      .run();

    count++;
  }

  return count;
}

/**
 * Backfill OHLC for last N days for all cards.
 */
export function backfillOHLC(days: number): number {
  let total = 0;
  const now = new Date();

  for (let i = days; i >= 1; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().split("T")[0]!;
    total += generateOHLCForDate(dateStr);
  }

  return total;
}

/**
 * Daily OHLC job — generates yesterday's OHLC for all active cards.
 */
export function dailyOHLCJob(): number {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0]!;
  return generateOHLCForDate(dateStr);
}

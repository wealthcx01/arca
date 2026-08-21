/**
 * ARCA Market Index — daily market-cap-weighted index of all priced cards.
 *
 * Base value = 1,000,000 (day 1).
 * Tracks: total market cap, card count, avg price, median price, top-10 concentration (HHI).
 */

import { eq, sql } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import { cardOhlcDaily, marketIndexDaily } from "./schema.ts";

const BASE_INDEX = 1_000_000;
const BP = 10_000;

/**
 * Compute and store market index for a given date.
 */
export function computeMarketIndex(date: string): void {
  const db = getDb();

  // Get all close prices for this date
  const prices = db.all<{ card_id: string; close_cents: number }>(sql`
    SELECT card_id, close_cents FROM card_ohlc_daily
    WHERE date = ${date} AND close_cents > 0
    ORDER BY close_cents DESC
  `);

  if (prices.length === 0) return;

  const cardCount = prices.length;
  const totalMarketCap = prices.reduce((sum, p) => sum + p.close_cents, 0);
  const avgPrice = Math.round(totalMarketCap / cardCount);

  // Median price
  const sorted = [...prices].sort((a, b) => a.close_cents - b.close_cents);
  const medianPrice =
    cardCount % 2 === 0
      ? Math.round(
          (sorted[cardCount / 2 - 1]!.close_cents + sorted[cardCount / 2]!.close_cents) / 2,
        )
      : sorted[Math.floor(cardCount / 2)]!.close_cents;

  // Top 10 concentration (HHI in basis points)
  const top10Value = prices.slice(0, 10).reduce((sum, p) => sum + p.close_cents, 0);
  const top10Concentration =
    totalMarketCap > 0 ? Math.round((top10Value / totalMarketCap) * BP) : 0;

  // Index value: relative to first day
  const firstDay = db
    .select({
      index_value_e6: marketIndexDaily.index_value_e6,
      total_market_cap_cents: marketIndexDaily.total_market_cap_cents,
    })
    .from(marketIndexDaily)
    .orderBy(marketIndexDaily.date)
    .limit(1)
    .get();

  let indexValue: number;
  if (!firstDay) {
    // This is day 1
    indexValue = BASE_INDEX;
  } else {
    // Index = base × (current market cap / day1 market cap)
    const day1Cap = firstDay.total_market_cap_cents;
    indexValue = day1Cap > 0 ? Math.round((totalMarketCap / day1Cap) * BASE_INDEX) : BASE_INDEX;
  }

  // Upsert
  db.delete(marketIndexDaily).where(eq(marketIndexDaily.date, date)).run();

  db.insert(marketIndexDaily)
    .values({
      date,
      index_value_e6: indexValue,
      total_market_cap_cents: totalMarketCap,
      card_count: cardCount,
      avg_price_cents: avgPrice,
      median_price_cents: medianPrice,
      top10_concentration_bp: top10Concentration,
    })
    .run();
}

/**
 * Backfill market index for all dates that have OHLC data.
 */
export function backfillMarketIndex(): number {
  const db = getDb();

  const dates = db.all<{ date: string }>(sql`
    SELECT DISTINCT date FROM card_ohlc_daily ORDER BY date ASC
  `);

  for (const { date } of dates) {
    computeMarketIndex(date);
  }

  return dates.length;
}

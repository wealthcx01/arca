/**
 * Seed analytics — runs the full analytics pipeline on existing data.
 *
 * Usage: bun run scripts/seed-analytics.ts [--backfill-days=30]
 */

import { sql } from "drizzle-orm";
import { getDb } from "../db/index.ts";
import { runDailyAnalytics } from "../modules/analytics/jobs.ts";
import { backfillMarketIndex } from "../modules/analytics/market-index.ts";
import { backfillOHLC, dailyOHLCJob } from "../modules/analytics/ohlc.ts";

const args = process.argv.slice(2);
const backfillDays = Number(
  args.find((a) => a.startsWith("--backfill-days="))?.split("=")[1] ?? "30",
);

console.log("=== ARCA Analytics Seed ===\n");

// Initialize DB
getDb();
console.log("Database connected.\n");

// Step 1: Backfill OHLC
console.log(`[1/4] Backfilling OHLC for last ${backfillDays} days...`);
const ohlcCount = backfillOHLC(backfillDays);
console.log(`  Generated ${ohlcCount} OHLC bars.\n`);

// Step 2: Generate today's OHLC
console.log("[2/4] Generating today's OHLC from current prices...");
const todayCount = dailyOHLCJob();
console.log(`  Generated ${todayCount} bars for yesterday.\n`);

// Step 3: Run full analytics pipeline
console.log("[3/4] Running full analytics pipeline...");
await runDailyAnalytics();
console.log("  Pipeline complete.\n");

// Step 4: Backfill market index
console.log("[4/4] Backfilling market index...");
const indexCount = backfillMarketIndex();
console.log(`  Generated ${indexCount} market index days.\n`);

console.log("=== Analytics seed complete! ===");

// Summary
const db = getDb();
const ohlcTotal = db.all(sql`SELECT COUNT(*) as cnt FROM card_ohlc_daily`);
const indicatorTotal = db.all(sql`SELECT COUNT(*) as cnt FROM technical_indicators`);
const analyticsTotal = db.all(sql`SELECT COUNT(*) as cnt FROM card_analytics`);
const indexTotal = db.all(sql`SELECT COUNT(*) as cnt FROM market_index_daily`);

const cardsTotal = db.all(sql`SELECT COUNT(*) as cnt FROM cards`);

const count = (rows: unknown): number => {
  const first = Array.isArray(rows) ? rows[0] : undefined;
  return typeof first === "object" && first !== null && "cnt" in first
    ? Number((first as { cnt: unknown }).cnt)
    : 0;
};

console.log("\nTable counts:");
console.log(`  cards:                 ${count(cardsTotal)}`);
console.log(`  card_ohlc_daily:       ${count(ohlcTotal)}`);
console.log(`  technical_indicators:  ${count(indicatorTotal)}`);
console.log(`  card_analytics:        ${count(analyticsTotal)}`);
console.log(`  market_index_daily:    ${count(indexTotal)}`);

// ARCA-56 Part B. An interrupted run is the normal failure here — the pipeline takes minutes and a
// 90-second default timeout kills it halfway — and until now it exited looking like a success while
// leaving the Analytics page presenting a handful of cards as though they were the whole market.
//
// Same spirit as ARCA-44's fix to the card seed: say so, and exit non-zero, rather than reporting
// success for work that did not finish.
const catalog = count(cardsTotal);
const analysed = count(analyticsTotal);
const COVERAGE_FLOOR = 0.8;

if (catalog > 0 && analysed / catalog < COVERAGE_FLOOR) {
  console.error(
    `\n⚠️  Analytics covers ${analysed} of ${catalog} cards (${Math.round((analysed / catalog) * 100)}%).`,
  );
  console.error("   The market index and its averages describe only that subset, not the market.");
  console.error(
    "   This usually means the run was interrupted. Re-run this script to complete it.",
  );
  process.exit(1);
}

console.log(`\n✅ Analytics covers ${analysed} of ${catalog} cards.`);

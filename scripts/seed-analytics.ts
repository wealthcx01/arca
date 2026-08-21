/**
 * Seed analytics — runs the full analytics pipeline on existing data.
 *
 * Usage: bun run scripts/seed-analytics.ts [--backfill-days=30]
 */

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
const ohlcTotal = db.all({ sql: "SELECT COUNT(*) as cnt FROM card_ohlc_daily", args: [] } as any);
const indicatorTotal = db.all({
  sql: "SELECT COUNT(*) as cnt FROM technical_indicators",
  args: [],
} as any);
const analyticsTotal = db.all({
  sql: "SELECT COUNT(*) as cnt FROM card_analytics",
  args: [],
} as any);
const indexTotal = db.all({
  sql: "SELECT COUNT(*) as cnt FROM market_index_daily",
  args: [],
} as any);

console.log("\nTable counts:");
console.log(`  card_ohlc_daily:       ${JSON.stringify(ohlcTotal)}`);
console.log(`  technical_indicators:  ${JSON.stringify(indicatorTotal)}`);
console.log(`  card_analytics:        ${JSON.stringify(analyticsTotal)}`);
console.log(`  market_index_daily:    ${JSON.stringify(indexTotal)}`);

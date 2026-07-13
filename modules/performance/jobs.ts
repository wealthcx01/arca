import { isNull } from "drizzle-orm";
import { getDb } from "../../db/index.ts";
import { scheduler } from "../../src/lib/scheduler.ts";
import { portfolios } from "../portfolio/schema.ts";
import { computeDailyPerformance } from "./calculator.ts";

// ---------------------------------------------------------------------------
// computeAllPerformance — Compute daily perf for all portfolios
// ---------------------------------------------------------------------------

export async function computeAllPerformance(): Promise<void> {
  const db = getDb();

  console.log("[performance:compute] Starting daily performance computation...");

  // Get all active (non-deleted) portfolios
  const activePortfolios = db
    .select({
      id: portfolios.id,
      base_currency: portfolios.base_currency,
    })
    .from(portfolios)
    .where(isNull(portfolios.deleted_at))
    .all();

  if (activePortfolios.length === 0) {
    console.log("[performance:compute] No active portfolios found, skipping.");
    return;
  }

  const today = new Date();
  // Normalize to start of day
  today.setHours(0, 0, 0, 0);

  let computed = 0;
  let failed = 0;

  for (const portfolio of activePortfolios) {
    try {
      await computeDailyPerformance(portfolio.id, today, portfolio.base_currency);
      computed++;
    } catch (err) {
      console.error(
        `[performance:compute] Error computing performance for portfolio ${portfolio.id}:`,
        err,
      );
      failed++;
    }
  }

  console.log(`[performance:compute] Complete. Computed: ${computed}, Failed: ${failed}.`);
}

// ---------------------------------------------------------------------------
// Register jobs with the scheduler
// ---------------------------------------------------------------------------

export function registerPerformanceJobs(): void {
  // Compute daily performance every 24 hours
  scheduler.register("performance:compute-daily", computeAllPerformance, 24 * 60 * 60 * 1000);
}

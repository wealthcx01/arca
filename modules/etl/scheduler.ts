/**
 * ETL scheduler — defines timing for all data pipelines.
 */

import { scheduler } from "../../src/lib/scheduler.ts";

/** Job schedule configuration. */
export const ETL_SCHEDULES = {
  // Pricing
  "pricing:free": 6 * 60 * 60 * 1000, // 6 hours
  "pricing:byok": 12 * 60 * 60 * 1000, // 12 hours

  // Analytics
  "analytics:ohlc": 24 * 60 * 60 * 1000, // daily
  "analytics:indicators": 24 * 60 * 60 * 1000, // daily (after OHLC)
  "analytics:daily": 24 * 60 * 60 * 1000, // daily full pipeline

  // FX
  "fx:rates": 4 * 60 * 60 * 1000, // 4 hours

  // Pop reports
  "pop:reports": 7 * 24 * 60 * 60 * 1000, // weekly

  // News (placeholder)
  "news:fetch": 2 * 60 * 60 * 1000, // 2 hours
} as const;

/**
 * Register all ETL jobs with the scheduler.
 * Note: Most jobs are registered by their respective modules.
 * This file serves as documentation of the schedule.
 */
export function getScheduleStatus() {
  return scheduler.getStatus();
}

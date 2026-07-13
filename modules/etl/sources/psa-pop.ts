/**
 * PSA Pop Report source — placeholder for population data extraction.
 *
 * PSA does not have an official API for population reports.
 * This module provides the interface for manual entry or future scraping.
 */

import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db/index.ts";
import { popReports } from "../../analytics/schema.ts";

interface PopReportEntry {
  card_id: string;
  grading_company: string;
  grade: string;
  population: number;
  population_higher: number;
  total_pop: number;
}

/**
 * Upsert population report entries.
 * Used for manual data entry or future automated scraping.
 */
export function upsertPopReports(entries: PopReportEntry[]): number {
  const db = getDb();
  let count = 0;

  for (const entry of entries) {
    // Delete existing
    db.delete(popReports)
      .where(
        and(
          eq(popReports.card_id, entry.card_id),
          eq(popReports.grading_company, entry.grading_company),
          eq(popReports.grade, entry.grade),
        ),
      )
      .run();

    // Insert new
    db.insert(popReports)
      .values({
        card_id: entry.card_id,
        grading_company: entry.grading_company,
        grade: entry.grade,
        population: entry.population,
        population_higher: entry.population_higher,
        total_pop: entry.total_pop,
      })
      .run();

    count++;
  }

  return count;
}

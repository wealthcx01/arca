import { afterAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { updateProviderStatus } from "./jobs";
import { priceSourceStatus } from "./schema";

/**
 * ARCA-57: Settings' "Pricing Sources" panel reads `cards_synced` off `price_source_status`,
 * defaulting to 0 when no row exists. `scripts/seed-prices.ts` populated `card_prices` directly
 * without ever writing this table, so a seeded environment showed "0 cards synced" for a source
 * that actually had hundreds of priced cards. The fix reuses this same upsert instead of a
 * parallel one — these tests are the "don't silently regress" guard the ticket asked for.
 */

const TEST_PROVIDER = "arca57-test-provider";

afterAll(() => {
  const db = getDb();
  db.delete(priceSourceStatus).where(eq(priceSourceStatus.provider, TEST_PROVIDER)).run();
});

describe("updateProviderStatus", () => {
  test("inserts a row when none exists for the provider", () => {
    const db = getDb();

    updateProviderStatus(TEST_PROVIDER, "ok", 42, null);

    const row = db
      .select()
      .from(priceSourceStatus)
      .where(eq(priceSourceStatus.provider, TEST_PROVIDER))
      .get();

    expect(row).toBeTruthy();
    expect(row?.status).toBe("ok");
    expect(row?.cards_synced).toBe(42);
    expect(row?.last_error).toBeNull();
  });

  test("updates the existing row instead of inserting a second one", () => {
    const db = getDb();

    updateProviderStatus(TEST_PROVIDER, "ok", 100, null);

    const rows = db
      .select()
      .from(priceSourceStatus)
      .where(eq(priceSourceStatus.provider, TEST_PROVIDER))
      .all();

    expect(rows.length).toBe(1);
    expect(rows[0]?.cards_synced).toBe(100);
  });

  test("a provider never synced still falls back to the default (untouched) state", () => {
    const db = getDb();

    const row = db
      .select()
      .from(priceSourceStatus)
      .where(eq(priceSourceStatus.provider, "arca57-never-synced-provider"))
      .get();

    expect(row).toBeUndefined();
  });
});

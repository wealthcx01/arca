import { afterAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { updateAuctionSourceStatus } from "./jobs.ts";
import { auctionSourceStatus } from "./schema.ts";

const TEST_PROVIDER = "arca69-test-provider";

afterAll(() => {
  const db = getDb();
  db.delete(auctionSourceStatus).where(eq(auctionSourceStatus.provider, TEST_PROVIDER)).run();
});

describe("updateAuctionSourceStatus", () => {
  test("inserts a row when none exists for the provider", () => {
    const db = getDb();

    updateAuctionSourceStatus(TEST_PROVIDER, "ok", 12, null);

    const row = db
      .select()
      .from(auctionSourceStatus)
      .where(eq(auctionSourceStatus.provider, TEST_PROVIDER))
      .get();

    expect(row).toBeTruthy();
    expect(row?.status).toBe("ok");
    expect(row?.listings_synced).toBe(12);
    expect(row?.last_error).toBeNull();
  });

  test("updates the existing row instead of inserting a second one", () => {
    const db = getDb();

    updateAuctionSourceStatus(TEST_PROVIDER, "error", 0, "eBay OAuth token request failed: 401");

    const rows = db
      .select()
      .from(auctionSourceStatus)
      .where(eq(auctionSourceStatus.provider, TEST_PROVIDER))
      .all();

    expect(rows.length).toBe(1);
    expect(rows[0]?.status).toBe("error");
    expect(rows[0]?.last_error).toBe("eBay OAuth token request failed: 401");
  });

  test("a provider never synced has no status row", () => {
    const db = getDb();

    const row = db
      .select()
      .from(auctionSourceStatus)
      .where(eq(auctionSourceStatus.provider, "arca69-never-synced-provider"))
      .get();

    expect(row).toBeUndefined();
  });
});

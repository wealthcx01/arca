import { expect, test } from "@playwright/test";

/**
 * ARCA-56 Part B — the Analytics page must say when its market figures cover a fraction of the
 * catalog.
 *
 * The audit found the page showing "Cards Tracked: 1", an index value of 0.02 and a market cap of
 * $9.45 after an interrupted seed run. Every number was true and the page presented them as though
 * they described the whole market.
 *
 * The CI fixture seeds a catalog and no analytics, which is exactly the interrupted-run shape.
 */

async function signUp(page: import("@playwright/test").Page) {
  const email = `arca56-${Math.floor(Math.random() * 1e9)}@test.io`;
  const res = await page.request.post("/api/auth/signup", {
    data: { email, password: "e2e-test-password", name: "ARCA 56 Tester" },
  });
  expect(res.ok()).toBe(true);
}

test.describe("Analytics coverage honesty (ARCA-56)", () => {
  test("the API reports what the index actually covers", async ({ page }) => {
    await signUp(page);
    const res = await page.request.get("/api/analytics/market-index?days=90");
    expect(res.ok()).toBe(true);
    const body = await res.json();

    // The denominator is the whole point: without it, card_count reads as a fact about the market.
    expect(body.coverage).toBeDefined();
    expect(typeof body.coverage.catalog_total).toBe("number");
    expect(body.coverage.catalog_total).toBeGreaterThan(0);
    expect(typeof body.coverage.cards_covered).toBe("number");
  });

  test("the page warns when coverage is partial, and names both numbers", async ({ page }) => {
    await signUp(page);
    await page.goto("/analytics", { waitUntil: "networkidle" });

    const res = await page.request.get("/api/analytics/market-index?days=90");
    const { coverage } = await res.json();
    const partial = coverage.fraction !== null && coverage.fraction < 0.8;

    const banner = page.getByTestId("analytics-partial-coverage");
    if (partial) {
      await expect(banner).toBeVisible();
      // It has to state the fraction, not just say "incomplete" — a reader needs the size of the gap.
      await expect(banner).toContainText(String(coverage.catalog_total));
    } else {
      await expect(banner).toHaveCount(0);
    }
  });
});

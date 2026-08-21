import { expect, test } from "@playwright/test";

/**
 * ARCA-50 — Set name must be visible on the card list and card detail pages.
 *
 * Prerequisites: backend on :3001, frontend dev server on :5173 (see client/playwright.config.ts baseURL).
 * Run: bun run test:e2e -- scripts/cards-set-name.pw.ts
 */

test.describe("Set name visibility (ARCA-50)", () => {
  test.beforeEach(async ({ page }) => {
    // ARCA-66: sign up through the API, as the other two suites do.
    //
    // This used to drive the sign-up FORM, and it was the one flaky thing in the suite: it waited
    // 3s for a "Sign up" toggle, silently skipped the click if the app had not rendered yet, and
    // then timed out 30s later on `#name` — a field that only exists once the toggle has been
    // clicked. A different test in this file failed on every local run, never the same one twice.
    //
    // These tests are about set names being visible, not about the sign-up screen. Getting a
    // session the cheap deterministic way is the right trade; the sign-up UI deserves its own test
    // rather than being a precondition of everything else.
    const email = `arca50-${test.info().parallelIndex}-${Math.floor(Math.random() * 1e9)}@test.io`;
    const signupRes = await page.request.post("/api/auth/signup", {
      data: { email, password: "e2e-test-password", name: "ARCA 50 Tester" },
    });
    expect(signupRes.ok()).toBe(true);
  });

  test("CardsPage grid view shows set name on every card", async ({ page }) => {
    await page.goto("/cards", { waitUntil: "networkidle" });
    await page.waitForSelector('a[href^="/cards/"]');

    const tiles = page.locator('a[href^="/cards/"]');
    const tileCount = await tiles.count();
    expect(tileCount).toBeGreaterThan(0);

    for (let i = 0; i < tileCount; i++) {
      const setNameEl = tiles.nth(i).locator("p.truncate").nth(1);
      const text = (await setNameEl.textContent())?.trim() ?? "";
      expect(text.length).toBeGreaterThan(0);
    }
  });

  test("CardsPage list view shows a Set column with a value per row", async ({ page }) => {
    await page.goto("/cards", { waitUntil: "networkidle" });
    await page.locator('button:has([class*="lucide-list"])').click();
    await page.waitForSelector("table tbody tr");

    await expect(page.locator("th", { hasText: "Set" })).toBeVisible();

    const rows = page.locator("table tbody tr");
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    for (let i = 0; i < rowCount; i++) {
      const setCell = rows.nth(i).locator("td").nth(1);
      const text = (await setCell.textContent())?.trim() ?? "";
      expect(text.length).toBeGreaterThan(0);
    }
  });

  test("CardDetailPage header shows the set name next to the card title", async ({ page }) => {
    await page.goto("/cards", { waitUntil: "networkidle" });
    await page.waitForSelector('a[href^="/cards/"]');
    await page.locator('a[href^="/cards/"]').first().click();
    await page.waitForURL(/\/cards\/.+/);

    const header = page.locator("div.font-mono").first();
    await expect(header).toBeVisible();
    const headerText = (await header.textContent()) ?? "";

    // Header renders "{name} | {set_name} #{card_number}" — assert a set name segment exists.
    expect(headerText).toMatch(/#\S+/);
    const parts = headerText.split("|").map((p) => p.trim());
    const setSegment = parts.find((p) => /#\S+$/.test(p));
    expect(setSegment).toBeTruthy();
    expect(setSegment!.replace(/#\S+$/, "").trim().length).toBeGreaterThan(0);
  });
});

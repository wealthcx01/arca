import { expect, test } from "@playwright/test";

/**
 * ARCA E2E — Verify all 13 routes load without crashing.
 *
 * Prerequisites:
 *   - Backend running on :3001
 *   - Frontend dev server running on :5173
 *   - A user account exists (tests assume logged-in state via cookie)
 *
 * Run: npx playwright test scripts/e2e-playwright.spec.ts
 */

// Routes that require auth will redirect to login.
// We test that each page at least loads the tab bar (Layout renders).
const publicRoutes = [
  { path: "/overview", label: "Overview" },
  { path: "/sets", label: "Sets & Eras" },
  { path: "/news", label: "News" },
  { path: "/cards", label: "Cards" },
  { path: "/graded", label: "Graded" },
  { path: "/watchlist", label: "Watchlist" },
  { path: "/screener", label: "Screener" },
  { path: "/portfolio", label: "Portfolio" },
  { path: "/transactions", label: "Trades" },
  { path: "/analytics", label: "Analytics" },
  { path: "/import", label: "Import" },
  { path: "/settings", label: "Settings" },
];

test.describe("ARCA Route Smoke Tests", () => {
  for (const route of publicRoutes) {
    test(`${route.path} — loads without error`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBeLessThan(500);

      // Page should render something (not blank)
      const body = await page.locator("body").textContent();
      expect(body?.length).toBeGreaterThan(0);

      // No unhandled JS errors that contain "Uncaught" or "chunk"
      const criticalErrors = consoleErrors.filter(
        (e) => e.includes("Uncaught") || e.includes("ChunkLoadError"),
      );
      expect(criticalErrors).toHaveLength(0);
    });
  }

  test("/ — redirects to /overview", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Should either be on /overview or login page
    const url = page.url();
    expect(url).toMatch(/\/(overview|$)/);
  });

  test("Tab bar renders with correct sections", async ({ page }) => {
    await page.goto("/overview", { waitUntil: "domcontentloaded" });

    // Look for ARCA branding
    const arcaText = await page.locator("text=ARCA").first();
    await expect(arcaText).toBeVisible();
  });
});

test.describe("Cards page — regression for ARCA-51 (pagination shape mismatch)", () => {
  test("/cards renders the catalog with a real total count and no crash", async ({ page }) => {
    // Sign up a fresh user so the page renders the real catalog instead of the
    // login form — the ARCA-51 crash only reproduces once `res.pagination.total`
    // is actually read while rendering the card grid.
    const email = `e2e-cards-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
    const signupRes = await page.request.post("/api/auth/signup", {
      data: { email, password: "e2e-test-password", name: "E2E Cards Test" },
    });
    expect(signupRes.ok()).toBe(true);

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/cards", { waitUntil: "domcontentloaded" });

    // The ErrorBoundary fallback must never show.
    await expect(page.locator("text=Something went wrong loading this page")).toHaveCount(0);

    // Wait for the real catalog to load (the count starts at "0 cards found"
    // before the fetch resolves) before reading the final total.
    await expect(page.locator('a[href^="/cards/"]').first()).toBeVisible({ timeout: 10_000 });

    const countText = await page.locator("text=/\\d[\\d,]* cards found/").first().textContent();

    expect(countText).toBeTruthy();
    const total = Number(countText!.replace(/[^\d]/g, ""));
    expect(total).toBeGreaterThan(0);
    expect(Number.isNaN(total)).toBe(false);

    const criticalErrors = consoleErrors.filter(
      (e) => e.includes("Uncaught") || e.includes("toLocaleString"),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  for (const viewport of [
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
    { width: 375, height: 812 },
  ]) {
    test(`/cards renders without crashing at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);

      const email = `e2e-cards-${viewport.width}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
      const signupRes = await page.request.post("/api/auth/signup", {
        data: { email, password: "e2e-test-password", name: "E2E Cards Test" },
      });
      expect(signupRes.ok()).toBe(true);

      await page.goto("/cards", { waitUntil: "domcontentloaded" });

      await expect(page.locator("text=Something went wrong loading this page")).toHaveCount(0);
      await expect(page.locator('a[href^="/cards/"]').first()).toBeVisible({ timeout: 10_000 });

      const countText = await page.locator("text=/\\d[\\d,]* cards found/").first().textContent();
      const total = Number(countText!.replace(/[^\d]/g, ""));
      expect(total).toBeGreaterThan(0);
    });
  }
});

test.describe("Card detail page — regression for ARCA-64 (price freshness label)", () => {
  test("shows a freshness label next to a price, sourced from the real fetch time", async ({
    page,
  }) => {
    const email = `e2e-freshness-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
    const signupRes = await page.request.post("/api/auth/signup", {
      data: { email, password: "e2e-test-password", name: "E2E Freshness Test" },
    });
    expect(signupRes.ok()).toBe(true);

    // Go straight to the fixture card `scripts/seed-fixture.ts` seeds a card_price/graded_price
    // row for (external_id "fixture-base1-1", Charizard) rather than picking "the first card" —
    // this test needs a card it KNOWS has priced data, not whichever one sorts first. Matched by
    // external_id, not just name: a developer's machine can also carry the REAL catalog's Charizard
    // (base1-4), which has no such price fixture and would otherwise make this test flaky depending
    // on which one the API happens to return first.
    const cardsRes = await page.request.get("/api/cards?q=Charizard&limit=50");
    expect(cardsRes.ok()).toBe(true);
    const cardsBody = (await cardsRes.json()) as {
      data: Array<{ id: string; external_id: string }>;
    };
    const fixtureCard = cardsBody.data.find((c) => c.external_id === "fixture-base1-1");
    expect(fixtureCard).toBeDefined();
    const cardId = fixtureCard?.id;

    await page.goto(`/cards/${cardId}`, { waitUntil: "domcontentloaded" });

    await expect(page.locator("text=Something went wrong loading this page")).toHaveCount(0);

    // Matches PriceFreshness's two render paths: "updated 2h ago" / "updated just now", or the
    // "no recent update" flag for a missing/stale timestamp — either is a real label, neither is
    // "Invalid Date" or nothing at all.
    const freshnessLabel = page.locator("text=/updated (just now|\\d+[mhd] ago)|no recent update/");
    await expect(freshnessLabel.first()).toBeVisible({ timeout: 10_000 });

    // The fixture price was seeded moments before this run, well inside any staleness threshold —
    // so this specific card must show a real relative time, not the "no recent update" fallback.
    await expect(page.locator("text=/updated (just now|\\d+m ago)/").first()).toBeVisible({
      timeout: 10_000,
    });
  });
});

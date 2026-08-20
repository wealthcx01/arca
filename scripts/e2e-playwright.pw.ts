import { test, expect } from "@playwright/test";

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

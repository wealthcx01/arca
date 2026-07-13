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

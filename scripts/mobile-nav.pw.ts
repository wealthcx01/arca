import { expect, test } from "@playwright/test";

/**
 * ARCA-58 — At 375px width, a scroll affordance/menu makes it discoverable that more nav
 * destinations exist, and all twelve destinations remain reachable without guessing.
 *
 * Prerequisites: backend on :3001, frontend dev server on :5173 (see client/playwright.config.ts baseURL).
 * Run: bun run test:e2e -- scripts/mobile-nav.pw.ts
 */

const ALL_TAB_HREFS = [
  "/overview",
  "/sets",
  "/news",
  "/cards",
  "/graded",
  "/watchlist",
  "/screener",
  "/portfolio",
  "/transactions",
  "/analytics",
  "/import",
  "/settings",
];

test.describe("Mobile nav (ARCA-58)", () => {
  test.beforeEach(async ({ page }) => {
    const email = `arca58-${test.info().parallelIndex}-${Math.floor(Math.random() * 1e9)}@test.io`;
    const signupRes = await page.request.post("/api/auth/signup", {
      data: { email, password: "e2e-test-password", name: "ARCA 58 Tester" },
    });
    expect(signupRes.ok()).toBe(true);
  });

  test("at 375px, a menu button is visible and reaches all twelve destinations", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto("/overview", { waitUntil: "networkidle" });

    const menuButton = page.locator('[data-testid="mobile-nav-menu-button"]');
    await expect(menuButton).toBeVisible();

    await menuButton.click();

    // The mobile menu dropdown is the last <a> per href in the nav (the tab bar renders first).
    for (const href of ALL_TAB_HREFS) {
      await expect(page.locator(`nav a[href="${href}"]`).last()).toBeVisible();
    }
  });

  test("at 375px, the desktop menu button stays hidden and no affordance is needed", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto("/overview", { waitUntil: "networkidle" });

    const menuButton = page.locator('[data-testid="mobile-nav-menu-button"]');
    await expect(menuButton).toBeHidden();

    for (const href of ALL_TAB_HREFS) {
      await expect(page.locator(`nav a[href="${href}"]`)).toBeVisible();
    }
  });

  test("at 375px, navigating directly to a tab near the end of the bar scrolls it into view", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto("/settings", { waitUntil: "networkidle" });

    const activeLink = page.locator('nav a[data-active="true"][href="/settings"]');
    await expect(activeLink).toBeVisible();

    const linkBox = await activeLink.boundingBox();
    const scrollContainer = page.locator("nav div.overflow-x-auto");
    const containerBox = await scrollContainer.boundingBox();

    expect(linkBox).not.toBeNull();
    expect(containerBox).not.toBeNull();
    if (linkBox && containerBox) {
      expect(linkBox.x).toBeGreaterThanOrEqual(containerBox.x - 1);
      expect(linkBox.x + linkBox.width).toBeLessThanOrEqual(
        containerBox.x + containerBox.width + 1,
      );
    }
  });
});

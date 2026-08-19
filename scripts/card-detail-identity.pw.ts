import { test, expect } from "@playwright/test";

/**
 * ARCA-53 — Card detail page must show the card's real name/set/number/rarity and
 * artwork, not blank fields and a broken-image icon.
 *
 * Navigates straight to a `/cards/:id` URL (never through CardsPage), so this test's
 * reliability doesn't depend on CardsPage's own health (see ARCA-51).
 *
 * Prerequisites: backend on :3001, frontend dev server on :5173 (see client/playwright.config.ts baseURL).
 * Run: bun run test:e2e -- scripts/card-detail-identity.pw.ts
 */

test.describe("Card detail identity (ARCA-53)", () => {
  test.beforeEach(async ({ page }) => {
    const email = `arca53-${test.info().parallelIndex}-${test.info().repeatEachIndex}-${Math.floor(Math.random() * 1e9)}@test.io`;
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const signupToggle = page.locator('button:has-text("Sign up")');
    if (await signupToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await signupToggle.click();
    }
    await page.locator("#name").fill("ARCA 53 Tester");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill("test1234test");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/overview/, { timeout: 10000 });
  });

  test("direct navigation to a card's detail URL shows its name and artwork", async ({ page }) => {
    const listRes = await page.request.get("/api/cards?limit=1");
    expect(listRes.ok()).toBe(true);
    const listBody = await listRes.json();
    expect(listBody.data.length).toBeGreaterThan(0);
    const cardData = listBody.data[0];

    await page.goto(`/cards/${cardData.id}`, { waitUntil: "networkidle" });

    const header = page.locator("div.font-mono").first();
    await expect(header).toBeVisible();
    await expect(header).toContainText(cardData.name);

    if (cardData.image_url || cardData.image_url_hires) {
      const image = page.locator('img[alt="' + cardData.name + '"]');
      await expect(image).toBeVisible();
      const brokenIcon = page.locator(".lucide-image-off");
      await expect(brokenIcon).toHaveCount(0);
    }
  });
});

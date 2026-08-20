import { expect, test } from "@playwright/test";

/**
 * ARCA-53 — Card detail page must show the card's identity (name, set, number,
 * rarity) and artwork, not blank fields and a broken-image icon.
 *
 * Navigates directly to a real `/cards/:id` URL fetched via the API — not via a
 * CardsPage click-through — so this test stays valid even if CardsPage itself is
 * broken (see ARCA-51).
 *
 * Prerequisites: backend on :3001, frontend dev server on :5173 (see client/playwright.config.ts baseURL).
 * Run: bun run test:e2e -- scripts/card-detail-identity.pw.ts
 */

async function signUp(page: import("@playwright/test").Page, tag: string) {
  const email = `arca53-${tag}-${Math.floor(Math.random() * 1e9)}@test.io`;
  const signupRes = await page.request.post("/api/auth/signup", {
    data: { email, password: "e2e-test-password", name: "ARCA 53 Tester" },
  });
  expect(signupRes.ok()).toBe(true);
}

async function findCardWithImage(page: import("@playwright/test").Page) {
  const res = await page.request.get("/api/cards?limit=20");
  expect(res.ok()).toBe(true);
  const body = await res.json();
  const card = body.data.find((c: { image_url: string | null }) => !!c.image_url);
  expect(card, "expected at least one seeded card with an image_url").toBeTruthy();
  return card;
}

test.describe("Card detail identity (ARCA-53)", () => {
  test("header shows the card name, set, number, and rarity; artwork renders", async ({ page }) => {
    await signUp(page, "identity");
    const card = await findCardWithImage(page);

    await page.goto(`/cards/${card.id}`, { waitUntil: "domcontentloaded" });

    const header = page.locator("div.font-mono").first();
    await expect(header).toBeVisible();
    await expect(header).toContainText(card.name);
    await expect(header).toContainText(card.set_name);
    await expect(header).toContainText(`#${card.card_number}`);
    if (card.rarity) {
      await expect(header).toContainText(card.rarity);
    }

    // Artwork renders as an <img>, not the ImageOff broken-image placeholder.
    const img = page.locator("img").first();
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute("src", /^https?:\/\//);
  });

  for (const viewport of [
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
    { width: 375, height: 812 },
  ]) {
    test(`renders identity and artwork at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await signUp(page, `vp${viewport.width}`);
      const card = await findCardWithImage(page);

      await page.goto(`/cards/${card.id}`, { waitUntil: "domcontentloaded" });

      const header = page.locator("div.font-mono").first();
      await expect(header).toContainText(card.name);

      const img = page.locator("img").first();
      await expect(img).toBeVisible();
    });
  }

  test("an unknown card id shows an error state, not a blank identity", async ({ page }) => {
    // GET /api/cards/:id returns 404 with { error: "Card not found" } for an unknown id
    // (modules/cards/handlers.ts:101-103) — confirmed separately in handlers.test.ts.
    // The client-side fetch wrapper (client/src/lib/api.ts) throws on non-2xx, and
    // CardDetailPage.tsx:110 catches that rejection with a generic "Failed to load card"
    // message rather than the server's message, which is what actually renders here.
    await signUp(page, "notfound");
    await page.goto("/cards/does-not-exist", { waitUntil: "domcontentloaded" });

    await expect(page.locator("text=Back to cards")).toBeVisible();
    await expect(page.getByRole("main").getByText("Failed to load card")).toBeVisible();
    // Never falls back to rendering a blank identity header.
    await expect(page.locator("div.font-mono")).toHaveCount(0);
  });
});

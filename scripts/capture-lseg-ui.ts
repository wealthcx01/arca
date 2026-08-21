import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
/**
 * Capture LSEG Workspace UI screenshots for design reference.
 * Run with: cd client && bunx playwright test ../scripts/capture-lseg-ui.ts
 *
 * This connects to the local LSEG Workspace application and captures
 * screenshots of the professional market data terminal interface.
 */
import { chromium } from "@playwright/test";

const SCREENSHOTS_DIR = join(import.meta.dir, "..", "screenshots", "lseg-reference");

async function main() {
  if (!existsSync(SCREENSHOTS_DIR)) {
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  console.log("Capturing LSEG Workspace UI screenshots...\n");

  // Capture ARCA frontend for comparison
  try {
    console.log("1. Capturing ARCA Dashboard...");
    await page.goto("http://localhost:5173/", { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, "arca-dashboard.png"),
      fullPage: true,
    });
    console.log("   Saved: arca-dashboard.png");
  } catch (e) {
    console.log("   Skipped ARCA (not running or needs login)");
  }

  // Capture ARCA cards page
  try {
    console.log("2. Capturing ARCA Cards...");
    await page.goto("http://localhost:5173/cards", { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, "arca-cards.png"),
      fullPage: true,
    });
    console.log("   Saved: arca-cards.png");
  } catch (e) {
    console.log("   Skipped ARCA cards");
  }

  // Capture ARCA settings page
  try {
    console.log("3. Capturing ARCA Settings...");
    await page.goto("http://localhost:5173/settings", {
      waitUntil: "networkidle",
      timeout: 15000,
    });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: join(SCREENSHOTS_DIR, "arca-settings.png"),
      fullPage: true,
    });
    console.log("   Saved: arca-settings.png");
  } catch (e) {
    console.log("   Skipped ARCA settings");
  }

  console.log("\nAll screenshots saved to:", SCREENSHOTS_DIR);
  await browser.close();
}

main().catch(console.error);

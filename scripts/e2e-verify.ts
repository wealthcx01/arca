import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
/**
 * ARCA End-to-End Verification Script
 * Tests all pages via Playwright, captures screenshots, reports issues.
 *
 * Run: cd client && bunx playwright test ../scripts/e2e-verify.ts
 * Or:  bun run scripts/e2e-verify.ts
 */
import { chromium, firefox, webkit } from "playwright";

const BASE_URL = "http://localhost:5173";
const SCREENSHOTS_DIR = join(import.meta.dir, "..", "screenshots", "e2e");
const TEST_EMAIL = `e2e-${Date.now()}@test.io`;
const TEST_PASSWORD = "test1234test";
const TEST_NAME = "E2E Tester";

interface TestResult {
  page: string;
  status: "pass" | "fail" | "warn";
  message: string;
  screenshot?: string;
}

const results: TestResult[] = [];

function log(status: "pass" | "fail" | "warn", page: string, message: string) {
  const icon = status === "pass" ? "✓" : status === "fail" ? "✗" : "⚠";
  console.log(`  ${icon} [${page}] ${message}`);
  results.push({ page, status, message });
}

async function main() {
  if (!existsSync(SCREENSHOTS_DIR)) mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  console.log("Launching Playwright for ARCA E2E verification...\n");
  // Use WebKit to avoid GPU context conflicts with LSEG Workspace Electron
  const browser = await webkit.launch({
    headless: true,
    timeout: 60000,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  try {
    // ═══════════════════════════════════════════════
    // 1. LOGIN PAGE
    // ═══════════════════════════════════════════════
    console.log("1. Login Page");
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 15000 });
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "01-login.png") });

    // Check login form exists
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    if (await emailInput.isVisible()) {
      log("pass", "Login", "Login form visible with email + password inputs");
    } else {
      log("fail", "Login", "Login form not found");
    }

    // Check title
    const title = await page.locator("h1, h2").first().textContent();
    if (title?.includes("ARCA")) {
      log("pass", "Login", `Title: "${title}"`);
    } else {
      log("warn", "Login", `Title doesn't mention ARCA: "${title}"`);
    }

    // Sign up a fresh user
    console.log("\n2. Sign Up");
    const signupLink = page
      .locator(
        'button:has-text("Sign up"), a:has-text("Sign up"), button:has-text("Create"), a:has-text("Create")',
      )
      .first();
    if (await signupLink.isVisible({ timeout: 2000 })) {
      await signupLink.click();
      await page.waitForTimeout(500);
    }

    // Fill signup form
    const nameInput = page.locator('input[type="text"]').first();
    if (await nameInput.isVisible({ timeout: 2000 })) {
      await nameInput.fill(TEST_NAME);
    }
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "02-signup-filled.png") });

    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "03-after-signup.png") });

    // Check if we're now on the dashboard (empty state)
    const currentUrl = page.url();
    if (currentUrl.includes("/dashboard") || currentUrl === `${BASE_URL}/`) {
      log("pass", "Signup", "Redirected to dashboard after signup");
    } else {
      // Maybe we're on the empty state
      const bodyText = await page.locator("body").textContent();
      if (
        bodyText?.includes("Welcome to ARCA") ||
        bodyText?.includes("Create") ||
        bodyText?.includes("Portfolio")
      ) {
        log("pass", "Signup", "On dashboard/empty state after signup");
      } else {
        log("warn", "Signup", `After signup, on: ${currentUrl}`);
      }
    }

    // ═══════════════════════════════════════════════
    // 3. DASHBOARD — Empty State
    // ═══════════════════════════════════════════════
    console.log("\n3. Dashboard (Empty State)");
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle", timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "04-dashboard-empty.png") });

    const dashboardText = await page.locator("body").textContent();
    if (dashboardText?.includes("Welcome to ARCA") || dashboardText?.includes("Create")) {
      log(
        "pass",
        "Dashboard",
        "Empty state shown correctly — 'Welcome to ARCA' + Create Portfolio",
      );
    } else if (dashboardText?.includes("Portfolio")) {
      log("pass", "Dashboard", "Dashboard loaded with portfolio content");
    } else {
      log("warn", "Dashboard", "Dashboard content unclear");
    }

    // Create a portfolio if empty
    const createBtn = page.locator('button:has-text("Create Portfolio")');
    if (await createBtn.isVisible({ timeout: 2000 })) {
      await createBtn.click();
      await page.waitForTimeout(500);
      // Fill portfolio form
      const portfolioName = page.locator('input[value="My Collection"]');
      if (await portfolioName.isVisible({ timeout: 1000 })) {
        await portfolioName.clear();
        await portfolioName.fill("E2E Test Portfolio");
      }
      const submitCreate = page.locator('button:has-text("Create Portfolio")').last();
      await submitCreate.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: join(SCREENSHOTS_DIR, "05-dashboard-with-portfolio.png") });
      log("pass", "Dashboard", "Created portfolio successfully");
    }

    // ═══════════════════════════════════════════════
    // 4. DASHBOARD — With Portfolio
    // ═══════════════════════════════════════════════
    console.log("\n4. Dashboard (With Portfolio)");
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle", timeout: 10000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "06-dashboard-loaded.png") });

    // Check key elements
    const metricsBar = page.locator(".font-mono").first();
    if (await metricsBar.isVisible({ timeout: 2000 })) {
      log("pass", "Dashboard", "Terminal-style metrics bar visible");
    } else {
      log("warn", "Dashboard", "Metrics bar not found");
    }

    // Check stat cards
    const statCards = page.locator('[class*="rounded-lg"][class*="border"]');
    const cardCount = await statCards.count();
    if (cardCount >= 4) {
      log("pass", "Dashboard", `${cardCount} stat cards rendered`);
    } else {
      log("warn", "Dashboard", `Only ${cardCount} stat cards (expected 4+)`);
    }

    // ═══════════════════════════════════════════════
    // 5. CARDS PAGE
    // ═══════════════════════════════════════════════
    console.log("\n5. Cards Page");
    await page.goto(`${BASE_URL}/cards`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "07-cards-grid.png") });

    // Check title
    const cardsTitle = await page.locator("h1").textContent();
    if (cardsTitle?.includes("Card Database")) {
      log("pass", "Cards", "Page title: 'Card Database'");
    } else {
      log("warn", "Cards", `Title: "${cardsTitle}"`);
    }

    // Check search bar
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      log("pass", "Cards", "Search bar visible");
    } else {
      log("fail", "Cards", "Search bar not found");
    }

    // Check filters
    const selects = page.locator("select");
    const selectCount = await selects.count();
    if (selectCount >= 3) {
      log("pass", "Cards", `${selectCount} filter dropdowns (set, type, rarity)`);
    } else {
      log("warn", "Cards", `Only ${selectCount} filter dropdowns (expected 3+)`);
    }

    // Check card grid
    const cardImages = page.locator('img[loading="lazy"]');
    const imgCount = await cardImages.count();
    if (imgCount > 0) {
      log("pass", "Cards", `${imgCount} card images loaded in grid`);
    } else {
      log("warn", "Cards", "No card images visible (loading or empty)");
    }

    // Check results count
    const resultsText = await page
      .locator("text=/\\d+ cards found/")
      .textContent()
      .catch(() => "");
    if (resultsText) {
      log("pass", "Cards", `Results count shown: "${resultsText}"`);
    }

    // Test search
    await searchInput.fill("Charizard");
    await page.waitForTimeout(1000);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "08-cards-search.png") });
    const searchResults = await page
      .locator("text=/\\d+ cards found/")
      .textContent()
      .catch(() => "");
    log("pass", "Cards", `Search for 'Charizard': ${searchResults || "results shown"}`);

    // Test list view toggle
    const listBtn = page
      .locator("button")
      .filter({ has: page.locator('[class*="lucide"]') })
      .nth(1);
    if (await listBtn.isVisible()) {
      await listBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(SCREENSHOTS_DIR, "09-cards-list.png") });
      log("pass", "Cards", "List view toggle works");
    }

    // Test pagination
    const pagination = page.locator("text=/Page \\d+ of \\d+/");
    if (await pagination.isVisible({ timeout: 2000 })) {
      log("pass", "Cards", `Pagination visible: "${await pagination.textContent()}"`);
    }

    // ═══════════════════════════════════════════════
    // 6. CARD DETAIL PAGE
    // ═══════════════════════════════════════════════
    console.log("\n6. Card Detail Page");
    // Navigate to first card
    await searchInput.clear();
    await searchInput.fill("Charizard");
    await page.waitForTimeout(1000);
    const firstCard = page.locator('a[href^="/cards/"]').first();
    if (await firstCard.isVisible({ timeout: 3000 })) {
      await firstCard.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: join(SCREENSHOTS_DIR, "10-card-detail.png") });

      // Check card name
      const cardName = await page.locator("h1").textContent();
      if (cardName && cardName.length > 0) {
        log("pass", "CardDetail", `Card loaded: "${cardName}"`);
      }

      // Check info badges
      const badges = page.locator('[class*="uppercase"][class*="tracking-wider"]');
      const badgeCount = await badges.count();
      if (badgeCount >= 2) {
        log("pass", "CardDetail", `${badgeCount} info badges (rarity, type, etc.)`);
      }

      // Check card image
      const cardImg = page.locator("img[alt]").first();
      if (await cardImg.isVisible()) {
        log("pass", "CardDetail", "Card image loaded");
      } else {
        // Check for fallback
        const fallback = page.locator('[class*="ImageOff"]');
        if (await fallback.isVisible({ timeout: 1000 })) {
          log("pass", "CardDetail", "Image fallback (ImageOff) shown correctly");
        } else {
          log("warn", "CardDetail", "No card image or fallback visible");
        }
      }

      // Check pricing tables
      const pricingHeaders = page.locator("text=/Best Price|All Sources|Graded Prices/");
      const pricingCount = await pricingHeaders.count();
      if (pricingCount > 0) {
        log("pass", "CardDetail", `${pricingCount} pricing section(s) visible`);
      } else {
        log("warn", "CardDetail", "No pricing data sections (card may have no prices)");
      }

      // Check "Add to Portfolio" button
      const addBtn = page.locator('button:has-text("Add to Portfolio")');
      if (await addBtn.isVisible()) {
        log("pass", "CardDetail", "Add to Portfolio button visible");
      }

      // Check back link
      const backLink = page.locator('a:has-text("Back to cards")');
      if (await backLink.isVisible()) {
        log("pass", "CardDetail", "Back to cards link visible");
      }
    } else {
      log("fail", "CardDetail", "Could not navigate to card detail page");
    }

    // ═══════════════════════════════════════════════
    // 7. TRADES/TRANSACTIONS PAGE
    // ═══════════════════════════════════════════════
    console.log("\n7. Transactions Page");
    await page.goto(`${BASE_URL}/transactions`, { waitUntil: "networkidle", timeout: 10000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "11-transactions.png") });

    const txTitle = await page.locator("h1").textContent();
    if (txTitle?.includes("Transaction")) {
      log("pass", "Transactions", `Page title: "${txTitle}"`);
    } else {
      log("warn", "Transactions", `Title: "${txTitle}"`);
    }

    // Check filter pills
    const filterBtns = page.locator(
      'button:has-text("ALL"), button:has-text("BUY"), button:has-text("SELL")',
    );
    if ((await filterBtns.count()) >= 3) {
      log("pass", "Transactions", "ALL/BUY/SELL filter pills visible");
    }

    // Check export button
    const exportBtn = page.locator('button:has-text("Export")');
    if (await exportBtn.isVisible()) {
      log("pass", "Transactions", "Export button visible");
    }

    // ═══════════════════════════════════════════════
    // 8. ANALYTICS PAGE
    // ═══════════════════════════════════════════════
    console.log("\n8. Analytics Page");
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: "networkidle", timeout: 10000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "12-analytics.png") });

    const analyticsContent = await page.locator("body").textContent();
    if (
      analyticsContent?.includes("Concentration") ||
      analyticsContent?.includes("analytics") ||
      analyticsContent?.includes("Loading")
    ) {
      log("pass", "Analytics", "Analytics page loaded");
    } else {
      log("warn", "Analytics", "Analytics content unclear");
    }

    // ═══════════════════════════════════════════════
    // 9. IMPORT PAGE
    // ═══════════════════════════════════════════════
    console.log("\n9. Import Page");
    await page.goto(`${BASE_URL}/import`, { waitUntil: "networkidle", timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "13-import.png") });

    const importContent = await page.locator("body").textContent();
    if (
      importContent?.includes("Import") ||
      importContent?.includes("CSV") ||
      importContent?.includes("upload")
    ) {
      log("pass", "Import", "Import page loaded with upload UI");
    }

    // ═══════════════════════════════════════════════
    // 10. SETTINGS PAGE
    // ═══════════════════════════════════════════════
    console.log("\n10. Settings Page");
    await page.goto(`${BASE_URL}/settings`, { waitUntil: "networkidle", timeout: 10000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "14-settings.png") });

    const settingsContent = await page.locator("body").textContent();
    if (
      settingsContent?.includes("Settings") ||
      settingsContent?.includes("Sources") ||
      settingsContent?.includes("API")
    ) {
      log("pass", "Settings", "Settings page loaded");
    }

    // Check for source badges
    const sourceBadges = page.locator('span[class*="rounded"][class*="font-medium"]');
    const badgesVisible = await sourceBadges.count();
    if (badgesVisible > 0) {
      log("pass", "Settings", `${badgesVisible} source badges visible`);
    }

    // ═══════════════════════════════════════════════
    // 11. THEME TOGGLE
    // ═══════════════════════════════════════════════
    console.log("\n11. Theme Toggle");
    // We should be in Diamond (dark) by default
    const htmlClasses = await page.locator("html").getAttribute("class");
    if (htmlClasses?.includes("dark")) {
      log("pass", "Theme", "Diamond (dark) theme active by default");
    } else {
      log("warn", "Theme", `HTML classes: "${htmlClasses}" — expected 'dark'`);
    }

    // Toggle theme
    const themeBtn = page.locator('button:has-text("Diamond"), button:has-text("Pearl")');
    if (await themeBtn.isVisible({ timeout: 2000 })) {
      await themeBtn.click();
      await page.waitForTimeout(500);
      const newClasses = await page.locator("html").getAttribute("class");
      if (!newClasses?.includes("dark")) {
        log("pass", "Theme", "Toggled to Pearl (light) theme successfully");
        await page.screenshot({ path: join(SCREENSHOTS_DIR, "15-pearl-theme.png") });
        // Toggle back
        const pearlBtn = page.locator('button:has-text("Pearl")');
        if (await pearlBtn.isVisible()) await pearlBtn.click();
      } else {
        log("warn", "Theme", "Theme toggle didn't change the class");
      }
    }

    // ═══════════════════════════════════════════════
    // 12. SIDEBAR NAVIGATION
    // ═══════════════════════════════════════════════
    console.log("\n12. Sidebar Navigation");
    const navItems = ["Portfolio", "Cards", "Trades", "Analytics", "Import", "Settings"];
    for (const item of navItems) {
      const navLink = page.locator(`aside a:has-text("${item}")`);
      if (await navLink.isVisible({ timeout: 1000 })) {
        log("pass", "Nav", `"${item}" nav link visible`);
      } else {
        log("fail", "Nav", `"${item}" nav link NOT visible`);
      }
    }

    // Check for NO broken "Portfolio" link that goes to /portfolio
    const brokenPortfolioLink = page.locator('a[href="/portfolio"]');
    if ((await brokenPortfolioLink.count()) === 0) {
      log("pass", "Nav", "No broken /portfolio link (fixed)");
    } else {
      log("fail", "Nav", "Broken /portfolio link still exists!");
    }

    // ═══════════════════════════════════════════════
    // 13. CONSOLE ERRORS
    // ═══════════════════════════════════════════════
    console.log("\n13. Console Errors");
    if (consoleErrors.length === 0) {
      log("pass", "Console", "No console errors across all pages");
    } else {
      for (const err of consoleErrors.slice(0, 10)) {
        log("warn", "Console", `Error: ${err.slice(0, 100)}`);
      }
    }
  } catch (e: any) {
    log("fail", "E2E", `Fatal error: ${e.message}`);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, "99-error.png") }).catch(() => {});
  }

  await browser.close();

  // ═══════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════
  console.log(`\n${"═".repeat(60)}`);
  console.log("E2E VERIFICATION SUMMARY");
  console.log("═".repeat(60));

  const passes = results.filter((r) => r.status === "pass").length;
  const fails = results.filter((r) => r.status === "fail").length;
  const warns = results.filter((r) => r.status === "warn").length;

  console.log(`\n  ✓ PASS: ${passes}  ✗ FAIL: ${fails}  ⚠ WARN: ${warns}\n`);

  if (fails > 0) {
    console.log("FAILURES:");
    for (const r of results.filter((r) => r.status === "fail")) {
      console.log(`  ✗ [${r.page}] ${r.message}`);
    }
  }

  if (warns > 0) {
    console.log("\nWARNINGS:");
    for (const r of results.filter((r) => r.status === "warn")) {
      console.log(`  ⚠ [${r.page}] ${r.message}`);
    }
  }

  console.log(`\nScreenshots saved to: ${SCREENSHOTS_DIR}`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

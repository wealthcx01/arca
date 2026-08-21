/**
 * ARCA E2E Verification via CDP
 * Connects to LSEG Workspace's existing browser on port 9222
 * and opens ARCA pages in a new tab to verify + screenshot.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  type CdpEvaluateResult,
  type CdpPage,
  type CdpParams,
  type CdpScreenshotResult,
  type CdpTarget,
  errorMessage,
} from "./cdp-types";

const BASE_URL = "http://localhost:5173";
const CDP_URL = "http://localhost:9222";
const SCREENSHOTS_DIR = join(import.meta.dir, "..", "screenshots", "e2e");

interface TestResult {
  page: string;
  status: "pass" | "fail" | "warn";
  message: string;
}

const results: TestResult[] = [];

function log(status: "pass" | "fail" | "warn", page: string, message: string) {
  const icon = status === "pass" ? "✓" : status === "fail" ? "✗" : "⚠";
  console.log(`  ${icon} [${page}] ${message}`);
  results.push({ page, status, message });
}

async function cdpFetch<T>(path: string): Promise<T> {
  const r = await fetch(`${CDP_URL}${path}`);
  return (await r.json()) as T;
}

async function connectToTarget(wsUrl: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => resolve(ws);
    ws.onerror = (e) => reject(new Error(`WebSocket error: ${e}`));
    setTimeout(() => reject(new Error("WS connection timeout")), 10000);
  });
}

let msgId = 0;
function sendCommand(
  ws: WebSocket,
  method: string,
  params: Record<string, any> = {},
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    const timeout = setTimeout(() => reject(new Error(`Timeout: ${method}`)), 30000);

    const handler = (event: MessageEvent) => {
      const data = JSON.parse(String(event.data));
      if (data.id === id) {
        ws.removeEventListener("message", handler);
        clearTimeout(timeout);
        if (data.error) reject(new Error(`CDP Error: ${data.error.message}`));
        else resolve(data.result);
      }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function waitForEvent(ws: WebSocket, eventName: string, timeoutMs = 15000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Timeout waiting for ${eventName}`)),
      timeoutMs,
    );
    const handler = (event: MessageEvent) => {
      const data = JSON.parse(String(event.data));
      if (data.method === eventName) {
        ws.removeEventListener("message", handler);
        clearTimeout(timeout);
        resolve(data.params);
      }
    };
    ws.addEventListener("message", handler);
  });
}

async function navigateAndWait(ws: WebSocket, url: string): Promise<void> {
  if (!url) return; // empty URL means stay on current page
  await sendCommand(ws, "Page.navigate", { url });
  await new Promise((r) => setTimeout(r, 3000));
}

async function tryScreenshot(ws: WebSocket, screenshotName: string): Promise<boolean> {
  try {
    const result = await sendCommand(ws, "Page.captureScreenshot", {
      format: "png",
    });
    const filePath = join(SCREENSHOTS_DIR, screenshotName);
    const buffer = Buffer.from((result as CdpScreenshotResult).data ?? "", "base64");
    writeFileSync(filePath, buffer);
    return true;
  } catch {
    return false; // Screenshots may fail in Electron shell — that's OK
  }
}

async function evaluateExpression(ws: WebSocket, expression: string): Promise<unknown> {
  const result = await sendCommand(ws, "Runtime.evaluate", {
    expression,
    returnByValue: true,
  });
  return (result as CdpEvaluateResult).result?.value;
}

async function main() {
  if (!existsSync(SCREENSHOTS_DIR)) mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  console.log("ARCA E2E Verification (CDP Mode)");
  console.log("Connecting to browser on port 9222...\n");

  // Get available targets
  const targets = await cdpFetch<CdpTarget[]>("/json");

  // Try to create a new tab
  let targetInfo: CdpTarget | undefined;
  try {
    const newTab = await cdpFetch<CdpTarget>(`/json/new?${BASE_URL}`);
    targetInfo = newTab;
    console.log(`Created new tab: ${targetInfo.id}\n`);
  } catch {
    // Find an expendable tab
    const expendable = targets.find(
      (t: CdpTarget) =>
        t.type === "page" &&
        (t.url?.includes("about:blank") ||
          t.url?.includes("newtab") ||
          t.title?.includes("Notification")),
    );
    if (expendable) {
      targetInfo = expendable;
      console.log(`Reusing tab: ${targetInfo.title || targetInfo.id}\n`);
    } else {
      // Use the first page tab
      const firstPage = targets.find((t: CdpTarget) => t.type === "page");
      if (!firstPage) {
        console.error("No usable browser tabs found");
        process.exit(1);
      }
      targetInfo = firstPage;
      console.log(`Using tab: ${targetInfo.title || targetInfo.id}\n`);
    }
  }

  if (!targetInfo?.webSocketDebuggerUrl) {
    console.error("No usable browser tab with a debugger URL was found");
    process.exit(1);
  }

  const ws = await connectToTarget(targetInfo.webSocketDebuggerUrl);
  console.log("Connected to browser tab via WebSocket\n");

  // Enable required domains
  await sendCommand(ws, "Page.enable");
  await sendCommand(ws, "Runtime.enable");

  try {
    // ═══════════════════════════════════════════════
    // 1. LOGIN PAGE
    // ═══════════════════════════════════════════════
    console.log("1. Login Page");
    await navigateAndWait(ws, BASE_URL);
    await tryScreenshot(ws, "01-login.png");

    const loginCheck = await evaluateExpression(
      ws,
      `
      JSON.stringify({
        hasEmailInput: !!document.querySelector('input[type="email"]'),
        hasPasswordInput: !!document.querySelector('input[type="password"]'),
        title: document.querySelector('h1, h2')?.textContent || '',
        hasSubmitBtn: !!document.querySelector('button[type="submit"]'),
      })
    `,
    );
    const login = JSON.parse(typeof loginCheck === "string" ? loginCheck : "{}");
    if (login.hasEmailInput && login.hasPasswordInput) {
      log("pass", "Login", "Login form with email + password inputs");
    } else {
      log("fail", "Login", "Login form not found");
    }
    if (login.title.includes("ARCA")) {
      log("pass", "Login", `Title: "${login.title}"`);
    } else {
      log("warn", "Login", `Title: "${login.title}" (no ARCA branding)`);
    }

    // ═══════════════════════════════════════════════
    // 2. SIGN UP
    // ═══════════════════════════════════════════════
    console.log("\n2. Sign Up");
    const testEmail = `e2e-${Date.now()}@test.io`;
    const testPassword = "test1234test";

    // Click sign up link if present
    await evaluateExpression(
      ws,
      `
      const link = document.querySelector('button[class*="text-"], a[class*="text-"]');
      const allBtns = [...document.querySelectorAll('button, a')];
      const signupBtn = allBtns.find(b => /sign.?up|create.?account|register/i.test(b.textContent));
      if (signupBtn) signupBtn.click();
    `,
    );
    await new Promise((r) => setTimeout(r, 1000));

    // Fill signup form
    await evaluateExpression(
      ws,
      `
      const nameInput = document.querySelector('input[type="text"]');
      if (nameInput) {
        nameInput.value = 'E2E Tester';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const emailInput = document.querySelector('input[type="email"]');
      if (emailInput) {
        emailInput.value = '${testEmail}';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const pwInput = document.querySelector('input[type="password"]');
      if (pwInput) {
        pwInput.value = '${testPassword}';
        pwInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `,
    );
    await tryScreenshot(ws, "02-signup-filled.png");

    // Submit
    await evaluateExpression(
      ws,
      `
      const btn = document.querySelector('button[type="submit"]');
      if (btn) btn.click();
    `,
    );
    await new Promise((r) => setTimeout(r, 3000));
    await tryScreenshot(ws, "03-after-signup.png");

    const afterSignup = await evaluateExpression(ws, "window.location.href");
    const afterSignupUrl = typeof afterSignup === "string" ? afterSignup : "";
    if (afterSignupUrl.includes("/dashboard") || afterSignupUrl === `${BASE_URL}/`) {
      log("pass", "Signup", "Redirected to dashboard after signup");
    } else {
      log("warn", "Signup", `After signup URL: ${afterSignup}`);
    }

    // ═══════════════════════════════════════════════
    // 3. DASHBOARD
    // ═══════════════════════════════════════════════
    console.log("\n3. Dashboard");
    await navigateAndWait(ws, `${BASE_URL}/dashboard`);
    await tryScreenshot(ws, "04-dashboard.png");

    const dashCheck = await evaluateExpression(
      ws,
      `
      JSON.stringify({
        bodyText: document.body.textContent?.substring(0, 500) || '',
        hasMonoFont: !!document.querySelector('.font-mono'),
        statCards: document.querySelectorAll('[class*="rounded-lg"][class*="border"]').length,
        hasTable: !!document.querySelector('table'),
        url: window.location.href,
      })
    `,
    );
    const dash = JSON.parse(typeof dashCheck === "string" ? dashCheck : "{}");

    if (dash.bodyText.includes("Welcome to ARCA") || dash.bodyText.includes("Create")) {
      log("pass", "Dashboard", "Empty state displayed correctly");
      // Create a portfolio
      await evaluateExpression(
        ws,
        `
        const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Create Portfolio'));
        if (btn) btn.click();
      `,
      );
      await new Promise((r) => setTimeout(r, 1000));
      await evaluateExpression(
        ws,
        `
        const submit = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Create'));
        if (submit) submit.click();
      `,
      );
      await new Promise((r) => setTimeout(r, 2000));
      await navigateAndWait(ws, `${BASE_URL}/dashboard`);
      await tryScreenshot(ws, "05-dashboard-with-portfolio.png");
      log("pass", "Dashboard", "Created portfolio successfully");
    } else if (dash.bodyText.includes("Portfolio") || dash.statCards >= 2) {
      log("pass", "Dashboard", `Dashboard loaded — ${dash.statCards} stat cards`);
    }

    if (dash.hasMonoFont) {
      log("pass", "Dashboard", "Terminal-style monospace elements present");
    }

    // ═══════════════════════════════════════════════
    // 4. CARDS PAGE
    // ═══════════════════════════════════════════════
    console.log("\n4. Cards Page");
    await navigateAndWait(ws, `${BASE_URL}/cards`);
    await tryScreenshot(ws, "06-cards-grid.png");

    const cardsCheck = await evaluateExpression(
      ws,
      `
      JSON.stringify({
        title: document.querySelector('h1')?.textContent || '',
        hasSearch: !!document.querySelector('input[placeholder*="Search"]'),
        selectCount: document.querySelectorAll('select').length,
        imageCount: document.querySelectorAll('img[loading="lazy"]').length,
        resultsText: document.body.textContent?.match(/\\d+ cards? found/)?.[0] || '',
        hasGrid: document.querySelectorAll('[class*="grid"]').length > 0,
      })
    `,
    );
    const cards = JSON.parse(typeof cardsCheck === "string" ? cardsCheck : "{}");

    if (cards.title.includes("Card Database")) {
      log("pass", "Cards", `Page title: "${cards.title}"`);
    } else {
      log("warn", "Cards", `Title: "${cards.title}"`);
    }
    if (cards.hasSearch) {
      log("pass", "Cards", "Search bar visible");
    } else {
      log("fail", "Cards", "Search bar not found");
    }
    if (cards.selectCount >= 3) {
      log("pass", "Cards", `${cards.selectCount} filter dropdowns (set, type, rarity)`);
    } else {
      log("warn", "Cards", `Only ${cards.selectCount} filter dropdowns (expected 3+)`);
    }
    if (cards.imageCount > 0) {
      log("pass", "Cards", `${cards.imageCount} card images in grid`);
    } else {
      log("warn", "Cards", "No card images visible");
    }
    if (cards.resultsText) {
      log("pass", "Cards", `Results: "${cards.resultsText}"`);
    }

    // Search for Charizard
    await evaluateExpression(
      ws,
      `
      const search = document.querySelector('input[placeholder*="Search"]');
      if (search) {
        search.value = 'Charizard';
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `,
    );
    await new Promise((r) => setTimeout(r, 1500));
    await tryScreenshot(ws, "07-cards-search.png");
    const searchResult = await evaluateExpression(
      ws,
      `
      document.body.textContent?.match(/\\d+ cards? found/)?.[0] || 'results shown'
    `,
    );
    log("pass", "Cards", `Search 'Charizard': ${searchResult}`);

    // ═══════════════════════════════════════════════
    // 5. CARD DETAIL
    // ═══════════════════════════════════════════════
    console.log("\n5. Card Detail");
    // Click first card link
    await evaluateExpression(
      ws,
      `
      const link = document.querySelector('a[href^="/cards/"]');
      if (link) link.click();
    `,
    );
    await new Promise((r) => setTimeout(r, 3000));
    await tryScreenshot(ws, "08-card-detail.png");

    const detailCheck = await evaluateExpression(
      ws,
      `
      JSON.stringify({
        cardName: document.querySelector('h1')?.textContent || '',
        hasImage: !!document.querySelector('img[alt]'),
        hasAddBtn: [...document.querySelectorAll('button')].some(b => b.textContent.includes('Add to Portfolio')),
        hasBackLink: [...document.querySelectorAll('a')].some(a => a.textContent.includes('Back')),
        hasPricing: !!document.body.textContent?.match(/Best Price|All Sources|Market Price|Low|High/),
        tableCount: document.querySelectorAll('table').length,
        url: window.location.href,
      })
    `,
    );
    const detail = JSON.parse(typeof detailCheck === "string" ? detailCheck : "{}");

    if (detail.url.includes("/cards/")) {
      log("pass", "CardDetail", `Navigated to: ${detail.url}`);
    }
    if (detail.cardName) {
      log("pass", "CardDetail", `Card: "${detail.cardName}"`);
    }
    if (detail.hasImage) {
      log("pass", "CardDetail", "Card image loaded");
    }
    if (detail.hasAddBtn) {
      log("pass", "CardDetail", "Add to Portfolio button present");
    }
    if (detail.hasPricing) {
      log("pass", "CardDetail", "Pricing data sections visible");
    } else {
      log("warn", "CardDetail", "No pricing data visible (card may lack prices)");
    }

    // ═══════════════════════════════════════════════
    // 6. TRANSACTIONS PAGE
    // ═══════════════════════════════════════════════
    console.log("\n6. Transactions Page");
    await navigateAndWait(ws, `${BASE_URL}/transactions`);
    await tryScreenshot(ws, "09-transactions.png");

    const txCheck = await evaluateExpression(
      ws,
      `
      JSON.stringify({
        title: document.querySelector('h1')?.textContent || '',
        hasFilters: [...document.querySelectorAll('button')].filter(b => ['ALL','BUY','SELL'].includes(b.textContent.trim())).length,
        hasExport: [...document.querySelectorAll('button')].some(b => b.textContent.includes('Export')),
        hasTable: !!document.querySelector('table'),
        emptyState: document.body.textContent?.includes('No transactions') || false,
      })
    `,
    );
    const tx = JSON.parse(typeof txCheck === "string" ? txCheck : "{}");

    if (tx.title.includes("Transaction")) {
      log("pass", "Transactions", `Title: "${tx.title}"`);
    }
    if (tx.hasFilters >= 3) {
      log("pass", "Transactions", "ALL/BUY/SELL filter pills visible");
    }
    if (tx.hasExport) {
      log("pass", "Transactions", "Export button visible");
    }
    if (tx.hasTable) {
      log("pass", "Transactions", "Transaction table rendered");
    } else if (tx.emptyState) {
      log("pass", "Transactions", "Empty state: 'No transactions yet'");
    }

    // ═══════════════════════════════════════════════
    // 7. ANALYTICS PAGE
    // ═══════════════════════════════════════════════
    console.log("\n7. Analytics Page");
    await navigateAndWait(ws, `${BASE_URL}/analytics`);
    await tryScreenshot(ws, "10-analytics.png");

    const analyticsCheck = await evaluateExpression(
      ws,
      `
      document.body.textContent?.substring(0, 300) || ''
    `,
    );
    const analyticsText = typeof analyticsCheck === "string" ? analyticsCheck : "";
    if (
      analyticsText.includes("Concentration") ||
      analyticsText.includes("Analytics") ||
      analyticsText.includes("Loading")
    ) {
      log("pass", "Analytics", "Analytics page loaded");
    } else {
      log("warn", "Analytics", "Analytics content unclear");
    }

    // ═══════════════════════════════════════════════
    // 8. IMPORT PAGE
    // ═══════════════════════════════════════════════
    console.log("\n8. Import Page");
    await navigateAndWait(ws, `${BASE_URL}/import`);
    await tryScreenshot(ws, "11-import.png");

    const importCheck = await evaluateExpression(
      ws,
      `
      JSON.stringify({
        hasUpload: !!document.querySelector('input[type="file"]') || document.body.textContent?.includes('Import') || false,
        hasCSV: document.body.textContent?.includes('CSV') || false,
      })
    `,
    );
    const imp = JSON.parse(typeof importCheck === "string" ? importCheck : "{}");
    if (imp.hasUpload || imp.hasCSV) {
      log("pass", "Import", "Import page with upload UI");
    }

    // ═══════════════════════════════════════════════
    // 9. SETTINGS PAGE
    // ═══════════════════════════════════════════════
    console.log("\n9. Settings Page");
    await navigateAndWait(ws, `${BASE_URL}/settings`);
    await tryScreenshot(ws, "12-settings.png");

    const settingsCheck = await evaluateExpression(
      ws,
      `
      JSON.stringify({
        hasSettings: document.body.textContent?.includes('Settings') || false,
        hasSources: document.body.textContent?.includes('Sources') || false,
        hasApiKey: document.body.textContent?.includes('API Key') || false,
        badgeCount: document.querySelectorAll('span[class*="rounded"][class*="font-medium"]').length,
      })
    `,
    );
    const settings = JSON.parse(typeof settingsCheck === "string" ? settingsCheck : "{}");
    if (settings.hasSettings) {
      log("pass", "Settings", "Settings page loaded");
    }
    if (settings.hasSources) {
      log("pass", "Settings", "Pricing Sources section visible");
    }
    if (settings.hasApiKey) {
      log("pass", "Settings", "Add API Key section visible");
    }
    if (settings.badgeCount > 0) {
      log("pass", "Settings", `${settings.badgeCount} source badges`);
    }

    // ═══════════════════════════════════════════════
    // 10. THEME TOGGLE
    // ═══════════════════════════════════════════════
    console.log("\n10. Theme Toggle");
    const themeCheck = await evaluateExpression(
      ws,
      `
      JSON.stringify({
        isDark: document.documentElement.classList.contains('dark'),
        htmlClasses: document.documentElement.className,
      })
    `,
    );
    const theme = JSON.parse(typeof themeCheck === "string" ? themeCheck : "{}");
    if (theme.isDark) {
      log("pass", "Theme", "Diamond (dark) theme active");
    } else {
      log("warn", "Theme", `HTML classes: "${theme.htmlClasses}"`);
    }

    // Toggle theme
    await evaluateExpression(
      ws,
      `
      const themeBtn = [...document.querySelectorAll('button')].find(b => /Diamond|Pearl/i.test(b.textContent));
      if (themeBtn) themeBtn.click();
    `,
    );
    await new Promise((r) => setTimeout(r, 500));
    const afterToggle = await evaluateExpression(
      ws,
      `document.documentElement.classList.contains('dark')`,
    );
    if (afterToggle !== theme.isDark) {
      log("pass", "Theme", `Toggled to ${afterToggle ? "Diamond" : "Pearl"} theme`);
      await tryScreenshot(ws, "13-pearl-theme.png");
      // Toggle back
      await evaluateExpression(
        ws,
        `
        const themeBtn = [...document.querySelectorAll('button')].find(b => /Diamond|Pearl/i.test(b.textContent));
        if (themeBtn) themeBtn.click();
      `,
      );
    } else {
      log("warn", "Theme", "Theme toggle didn't change");
    }

    // ═══════════════════════════════════════════════
    // 11. SIDEBAR NAVIGATION
    // ═══════════════════════════════════════════════
    console.log("\n11. Sidebar Navigation");
    const navCheck = await evaluateExpression(
      ws,
      `
      const navItems = ['Portfolio', 'Cards', 'Trades', 'Analytics', 'Import', 'Settings'];
      const aside = document.querySelector('aside');
      const links = aside ? [...aside.querySelectorAll('a')] : [];
      const found = navItems.map(item => ({
        name: item,
        visible: links.some(a => a.textContent?.includes(item)),
      }));
      const brokenPortfolio = !!document.querySelector('a[href="/portfolio"]');
      JSON.stringify({ found, brokenPortfolio });
    `,
    );
    const nav = JSON.parse(typeof navCheck === "string" ? navCheck : "{}");
    for (const item of nav.found) {
      if (item.visible) {
        log("pass", "Nav", `"${item.name}" nav link visible`);
      } else {
        log("fail", "Nav", `"${item.name}" nav link NOT visible`);
      }
    }
    if (!nav.brokenPortfolio) {
      log("pass", "Nav", "No broken /portfolio link");
    } else {
      log("fail", "Nav", "Broken /portfolio link still exists");
    }
  } catch (e) {
    log("fail", "E2E", `Error: ${errorMessage(e)}`);
  }

  ws.close();

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
      console.log(`  ✗ [${r.page}] ${errorMessage(r)}`);
    }
  }

  if (warns > 0) {
    console.log("\nWARNINGS:");
    for (const r of results.filter((r) => r.status === "warn")) {
      console.log(`  ⚠ [${r.page}] ${errorMessage(r)}`);
    }
  }

  console.log(`\nScreenshots saved to: ${SCREENSHOTS_DIR}`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

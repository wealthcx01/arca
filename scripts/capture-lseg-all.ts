/**
 * Capture ALL LSEG Workspace UI info via CDP.
 * Extract DOM structure, CSS variables, layout patterns, color schemes.
 * Also capture whatever screenshots we can.
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

const CDP_URL = "http://localhost:9222";
const SCREENSHOTS_DIR = join(import.meta.dir, "..", "screenshots", "lseg-reference");
const ANALYSIS_DIR = join(import.meta.dir, "..", "screenshots", "lseg-analysis");

function cdpSession(wsUrl: string): Promise<{
  send: (method: string, params?: CdpParams) => Promise<unknown>;
  close: () => void;
}> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let msgId = 0;
    const pending = new Map<
      number,
      { resolve: (v: unknown) => void; reject: (e: unknown) => void }
    >();

    ws.onopen = () => {
      resolve({
        send: (method: string, params: CdpParams = {}) => {
          return new Promise((res, rej) => {
            const id = ++msgId;
            pending.set(id, { resolve: res, reject: rej });
            ws.send(JSON.stringify({ id, method, params }));
            setTimeout(() => {
              if (pending.has(id)) {
                pending.delete(id);
                rej(new Error(`CDP timeout for ${method}`));
              }
            }, 15000);
          });
        },
        close: () => ws.close(),
      });
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id)!;
        pending.delete(msg.id);
        if (msg.error) p.reject(msg.error);
        else p.resolve(msg.result);
      }
    };

    ws.onerror = (e) => reject(e);
    setTimeout(() => reject(new Error("Connection timeout")), 10000);
  });
}

async function analyzeTarget(target: any, index: number) {
  if (!target.webSocketDebuggerUrl) return null;

  try {
    const page = await cdpSession(target.webSocketDebuggerUrl);
    await page.send("Page.enable");
    await page.send("Runtime.enable");

    // Try screenshot first
    let screenshotSaved = false;
    try {
      const ss = (await page.send("Page.captureScreenshot", {
        format: "png",
      })) as CdpScreenshotResult;
      if (ss.data) {
        const buf = Buffer.from(ss.data, "base64");
        if (buf.length > 1000) {
          // Skip trivially small screenshots
          const safeName = target.title
            .replace(/[^a-zA-Z0-9 -]/g, "")
            .replace(/\s+/g, "-")
            .toLowerCase()
            .slice(0, 50);
          writeFileSync(join(SCREENSHOTS_DIR, `lseg-${safeName}.png`), buf);
          screenshotSaved = true;
          console.log(`  Screenshot: ${safeName}.png (${(buf.length / 1024).toFixed(0)} KB)`);
        }
      }
    } catch {
      console.log("  Screenshot: failed");
    }

    // Extract detailed UI analysis
    const analysis = await page.send("Runtime.evaluate", {
      expression: `
        (function() {
          const result = {
            title: document.title,
            url: location.href,
            viewport: { w: window.innerWidth, h: window.innerHeight },
            bodyClasses: document.body?.className?.toString()?.slice(0, 200),
            htmlClasses: document.documentElement?.className?.toString()?.slice(0, 200),
          };

          // Extract computed CSS custom properties from root
          const rootStyle = getComputedStyle(document.documentElement);
          const bodyStyle = getComputedStyle(document.body || document.documentElement);
          result.colors = {
            background: bodyStyle.backgroundColor,
            color: bodyStyle.color,
            fontFamily: bodyStyle.fontFamily?.slice(0, 100),
            fontSize: bodyStyle.fontSize,
          };

          // Extract all CSS custom properties
          const cssVars = {};
          const sheets = document.styleSheets;
          try {
            for (const sheet of sheets) {
              try {
                for (const rule of sheet.cssRules || []) {
                  if (rule.selectorText === ':root' || rule.selectorText === ':host' || rule.selectorText === 'body') {
                    for (let i = 0; i < rule.style.length; i++) {
                      const prop = rule.style[i];
                      if (prop.startsWith('--')) {
                        cssVars[prop] = rule.style.getPropertyValue(prop).trim();
                      }
                    }
                  }
                }
              } catch {}
            }
          } catch {}
          result.cssVars = cssVars;

          // Analyze layout structure
          const allElements = document.querySelectorAll('*');
          const tagCounts = {};
          const classCounts = {};
          for (const el of allElements) {
            tagCounts[el.tagName] = (tagCounts[el.tagName] || 0) + 1;
            for (const cls of el.classList || []) {
              if (cls.length > 2 && cls.length < 50) {
                classCounts[cls] = (classCounts[cls] || 0) + 1;
              }
            }
          }
          result.tagCounts = tagCounts;
          result.topClasses = Object.entries(classCounts)
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .slice(0, 30)
            .map(([cls, count]) => ({ cls, count }));

          // Extract unique colors used
          const colorSet = new Set();
          const sampleElements = Array.from(allElements).slice(0, 200);
          for (const el of sampleElements) {
            const style = getComputedStyle(el);
            colorSet.add(style.backgroundColor);
            colorSet.add(style.color);
            colorSet.add(style.borderColor);
          }
          result.uniqueColors = Array.from(colorSet).filter(c => c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent').slice(0, 50);

          // Navigation / menu structure
          result.navItems = Array.from(document.querySelectorAll('nav a, .nav a, [role="navigation"] a, [class*="nav"] a, [class*="menu"] a, [class*="sidebar"] a, header a, .header a'))
            .slice(0, 30)
            .map(el => ({
              text: el.textContent?.trim()?.slice(0, 40),
              href: (el as HTMLAnchorElement).href?.slice(0, 80),
            }))
            .filter(l => l.text);

          // Headings
          result.headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'))
            .slice(0, 20)
            .map(el => ({ tag: el.tagName, text: el.textContent?.trim()?.slice(0, 60) }));

          // Tables / data grids
          result.tables = Array.from(document.querySelectorAll('table, [role="grid"], [class*="grid"], [class*="table"]'))
            .slice(0, 10)
            .map(el => ({
              tag: el.tagName,
              class: el.className?.toString()?.slice(0, 60),
              rows: el.querySelectorAll('tr, [role="row"]').length,
              cols: el.querySelector('tr, [role="row"]')?.children?.length || 0,
            }));

          // Key UI patterns
          result.uiPatterns = {
            hasSearchBar: !!document.querySelector('input[type="search"], [class*="search"], [placeholder*="search" i]'),
            hasTabs: document.querySelectorAll('[role="tab"], .tab, [class*="tab"]').length,
            hasCards: document.querySelectorAll('[class*="card"], .card').length,
            hasCharts: document.querySelectorAll('canvas, svg, [class*="chart"]').length,
            hasModals: document.querySelectorAll('[role="dialog"], .modal, [class*="modal"]').length,
            hasSidebar: !!document.querySelector('[class*="sidebar"], aside, .side-panel'),
            hasToolbar: !!document.querySelector('[role="toolbar"], .toolbar, [class*="toolbar"]'),
          };

          return JSON.stringify(result, null, 2);
        })()
      `,
      returnByValue: true,
    });

    const analysisValue = (analysis as CdpEvaluateResult).result?.value;
    const analysisData = JSON.parse(typeof analysisValue === "string" ? analysisValue : "{}");
    page.close();

    return { ...analysisData, screenshotSaved };
  } catch (e) {
    return { error: errorMessage(e).slice(0, 100) };
  }
}

async function main() {
  for (const dir of [SCREENSHOTS_DIR, ANALYSIS_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  console.log("Fetching LSEG Workspace targets...\n");
  const resp = await fetch(`${CDP_URL}/json`);
  const targets = await resp.json();

  const pages = targets.filter((t: CdpTarget) => t.type === "page" && t.webSocketDebuggerUrl);
  console.log(`Found ${pages.length} page targets\n`);

  const fullAnalysis: any[] = [];

  for (let i = 0; i < pages.length; i++) {
    const target = pages[i];
    console.log(`\n[${i + 1}/${pages.length}] "${target.title}"`);
    console.log(`  URL: ${target.url?.slice(0, 100)}`);

    const analysis = await analyzeTarget(target, i);
    if (analysis) {
      fullAnalysis.push({ target: target.title, ...analysis });

      // Print key findings
      if (analysis.colors) {
        console.log(`  BG: ${analysis.colors.background} | FG: ${analysis.colors.color}`);
        console.log(
          `  Font: ${analysis.colors.fontFamily?.slice(0, 60)} @ ${analysis.colors.fontSize}`,
        );
      }
      if (analysis.viewport) {
        console.log(`  Viewport: ${analysis.viewport.w}x${analysis.viewport.h}`);
      }
      if (analysis.uiPatterns) {
        const p = analysis.uiPatterns;
        const patterns = [];
        if (p.hasSearchBar) patterns.push("search");
        if (p.hasTabs) patterns.push(`${p.hasTabs} tabs`);
        if (p.hasCards) patterns.push(`${p.hasCards} cards`);
        if (p.hasCharts) patterns.push(`${p.hasCharts} charts`);
        if (p.hasSidebar) patterns.push("sidebar");
        if (p.hasToolbar) patterns.push("toolbar");
        if (patterns.length) console.log(`  UI: ${patterns.join(", ")}`);
      }
      if (analysis.navItems?.length) {
        console.log(`  Nav: ${analysis.navItems.map((n: any) => n.text).join(" | ")}`);
      }
      if (Object.keys(analysis.cssVars || {}).length) {
        console.log(`  CSS vars: ${Object.keys(analysis.cssVars).length} custom properties`);
      }
    }
  }

  // Save full analysis
  writeFileSync(join(ANALYSIS_DIR, "lseg-ui-analysis.json"), JSON.stringify(fullAnalysis, null, 2));
  console.log(`\n\nFull analysis saved to: ${join(ANALYSIS_DIR, "lseg-ui-analysis.json")}`);

  // Generate summary report
  const report = generateReport(fullAnalysis);
  writeFileSync(join(ANALYSIS_DIR, "lseg-ui-report.md"), report);
  console.log(`Design report saved to: ${join(ANALYSIS_DIR, "lseg-ui-report.md")}`);
}

function generateReport(analyses: any[]): string {
  const lines: string[] = ["# LSEG Workspace UI Analysis Report\n"];
  lines.push(`Generated: ${new Date().toISOString()}\n`);

  // Collect all unique colors across all targets
  const allColors = new Set<string>();
  const allFonts = new Set<string>();
  const allCssVars: Record<string, string> = {};

  for (const a of analyses) {
    if (a.uniqueColors) a.uniqueColors.forEach((c: string) => allColors.add(c));
    if (a.colors?.fontFamily) allFonts.add(a.colors.fontFamily);
    if (a.cssVars) Object.assign(allCssVars, a.cssVars);
  }

  lines.push("## Color Palette\n");
  for (const color of allColors) {
    lines.push(`- \`${color}\``);
  }

  lines.push("\n## Typography\n");
  for (const font of allFonts) {
    lines.push(`- \`${font}\``);
  }

  if (Object.keys(allCssVars).length) {
    lines.push("\n## CSS Custom Properties\n");
    for (const [prop, val] of Object.entries(allCssVars)) {
      lines.push(`- \`${prop}: ${val}\``);
    }
  }

  lines.push("\n## Page Analysis\n");
  for (const a of analyses) {
    lines.push(`### ${a.target}\n`);
    if (a.error) {
      lines.push(`Error: ${a.error}\n`);
      continue;
    }
    if (a.viewport) lines.push(`- Viewport: ${a.viewport.w}x${a.viewport.h}`);
    if (a.colors) {
      lines.push(`- Background: \`${a.colors.background}\``);
      lines.push(`- Text: \`${a.colors.color}\``);
      lines.push(`- Font: \`${a.colors.fontFamily}\` @ ${a.colors.fontSize}`);
    }
    if (a.uiPatterns) {
      const p = a.uiPatterns;
      lines.push(
        `- UI Patterns: search=${p.hasSearchBar}, tabs=${p.hasTabs}, cards=${p.hasCards}, charts=${p.hasCharts}, sidebar=${p.hasSidebar}, toolbar=${p.hasToolbar}`,
      );
    }
    if (a.tables?.length) {
      lines.push(`- Data grids: ${a.tables.length}`);
      for (const t of a.tables) {
        lines.push(`  - ${t.class || t.tag}: ${t.rows} rows × ${t.cols} cols`);
      }
    }
    if (a.headings?.length) {
      lines.push(`- Headings: ${a.headings.map((h: any) => `${h.tag}:"${h.text}"`).join(", ")}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

main().catch(console.error);

/**
 * Navigate the LSEG web terminal tab (already open in Workspace) through all main pages.
 * Login with u0001/u0001, then capture each section.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CDP_URL = "http://localhost:9222";
const SCREENSHOTS_DIR = join(import.meta.dir, "..", "screenshots", "lseg-web");

function cdpSession(wsUrl: string): Promise<{
  send: (method: string, params?: any) => Promise<any>;
  close: () => void;
}> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let msgId = 0;
    const pending = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>();

    ws.onopen = () =>
      resolve({
        send: (method: string, params: any = {}) =>
          new Promise((res, rej) => {
            const id = ++msgId;
            pending.set(id, { resolve: res, reject: rej });
            ws.send(JSON.stringify({ id, method, params }));
            setTimeout(() => {
              if (pending.has(id)) {
                pending.delete(id);
                rej(new Error(`timeout: ${method}`));
              }
            }, 30000);
          }),
        close: () => ws.close(),
      });

    ws.onmessage = (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id)!;
        pending.delete(msg.id);
        msg.error ? p.reject(msg.error) : p.resolve(msg.result);
      }
    };

    ws.onerror = (e) => reject(e);
    setTimeout(() => reject(new Error("Connection timeout")), 10000);
  });
}

async function screenshot(page: any, filename: string): Promise<boolean> {
  try {
    const ss = await page.send("Page.captureScreenshot", { format: "png" });
    if (ss.data) {
      const buf = Buffer.from(ss.data, "base64");
      writeFileSync(join(SCREENSHOTS_DIR, filename), buf);
      console.log(`  Screenshot: ${filename} (${(buf.length / 1024).toFixed(0)} KB)`);
      return true;
    }
  } catch (e: any) {
    console.log(`  Screenshot failed: ${e.message?.slice(0, 60)}`);
  }
  return false;
}

async function evalJS(page: any, expression: string): Promise<any> {
  try {
    const result = await page.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return result?.result?.value;
  } catch (e: any) {
    console.log(`  Eval failed: ${e.message?.slice(0, 80)}`);
    return null;
  }
}

async function main() {
  if (!existsSync(SCREENSHOTS_DIR)) mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  // Find the "Refinitiv Market Monitor Asia" tab
  const resp = await fetch(`${CDP_URL}/json`);
  const targets = await resp.json();
  const lsegTab = targets.find(
    (t: any) => t.title?.includes("Refinitiv Market Monitor") && t.webSocketDebuggerUrl,
  );

  if (!lsegTab) {
    console.log("ERROR: No LSEG web tab found. Available pages:");
    targets
      .filter((t: any) => t.type === "page")
      .forEach((t: any) => console.log(`  "${t.title}"`));
    return;
  }

  console.log(`Found: "${lsegTab.title}" at ${lsegTab.url.slice(0, 80)}\n`);
  const page = await cdpSession(lsegTab.webSocketDebuggerUrl);
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  await page.send("DOM.enable");

  // Step 1: Screenshot login page
  console.log("1. Login page");
  await screenshot(page, "01-login.png");

  // Step 2: Fill login and submit
  console.log("\n2. Logging in...");
  const loginResult = await evalJS(
    page,
    `
    (function() {
      var inputs = document.querySelectorAll('input');
      var filled = [];
      for (var i = 0; i < inputs.length; i++) {
        var inp = inputs[i];
        if (inp.type === 'password') {
          inp.value = 'u0001';
          inp.dispatchEvent(new Event('input', {bubbles:true}));
          inp.dispatchEvent(new Event('change', {bubbles:true}));
          filled.push('password');
        } else if (inp.type === 'text' || inp.type === 'email' || inp.type === '') {
          inp.value = 'u0001';
          inp.dispatchEvent(new Event('input', {bubbles:true}));
          inp.dispatchEvent(new Event('change', {bubbles:true}));
          filled.push('username:' + inp.name);
        }
      }
      // Click login button
      var btns = document.querySelectorAll('button, input[type="submit"], .pushbutton, a[onclick]');
      for (var j = 0; j < btns.length; j++) {
        var txt = btns[j].textContent || btns[j].value || '';
        if (txt.toLowerCase().indexOf('login') >= 0 || txt.toLowerCase().indexOf('log in') >= 0) {
          btns[j].click();
          filled.push('clicked:' + txt.trim());
          break;
        }
      }
      // Also try submitting any form
      var form = document.querySelector('form');
      if (form && filled.indexOf('clicked') === -1) {
        form.submit();
        filled.push('form-submitted');
      }
      // Also try calling doLogin() if it exists
      if (typeof doLogin === 'function') {
        try { doLogin(); filled.push('doLogin()'); } catch(e) { filled.push('doLogin-err:' + e.message); }
      }
      return JSON.stringify(filled);
    })()
  `,
  );
  console.log(`  Login attempt: ${loginResult}`);

  // Wait for page to load after login
  console.log("  Waiting for app to load...");
  await new Promise((r) => setTimeout(r, 10000));
  await screenshot(page, "02-after-login.png");

  // Step 3: Get page info
  console.log("\n3. Analyzing loaded page...");
  const pageInfo = await evalJS(
    page,
    `
    JSON.stringify({
      title: document.title,
      url: location.href,
      bodyHTML: document.body ? document.body.innerHTML.slice(0, 2000) : 'no body',
      allLinks: Array.from(document.querySelectorAll('a')).slice(0, 30).map(function(a) {
        return { text: (a.textContent || '').trim().slice(0, 40), href: a.href ? a.href.slice(0, 100) : '' };
      }).filter(function(l) { return l.text.length > 0; }),
      allFrames: Array.from(document.querySelectorAll('iframe, frame')).map(function(f) {
        return { src: f.src ? f.src.slice(0, 120) : '', name: f.name || '', id: f.id || '' };
      }),
      hasFrameset: !!document.querySelector('frameset'),
    })
  `,
  );

  if (pageInfo) {
    const info = JSON.parse(pageInfo);
    console.log(`  Title: ${info.title}`);
    console.log(`  URL: ${info.url}`);
    console.log(`  Frameset: ${info.hasFrameset}`);
    console.log(`  Frames: ${info.allFrames?.length || 0}`);
    if (info.allFrames?.length) {
      for (const f of info.allFrames) {
        console.log(`    - ${f.name || f.id || "unnamed"}: ${f.src}`);
      }
    }
    console.log(`  Links: ${info.allLinks?.length || 0}`);
    for (const l of (info.allLinks || []).slice(0, 20)) {
      console.log(`    - "${l.text}" → ${l.href}`);
    }
    if (info.bodyHTML) {
      console.log("\n  Body preview (first 500 chars):");
      console.log(`  ${info.bodyHTML.slice(0, 500)}`);
    }
  }

  // Step 4: Try to navigate within the app
  console.log("\n4. Navigating sections...");
  const sections = [
    "Home",
    "Markets",
    "Company",
    "News",
    "Charting",
    "Chart",
    "Portfolio",
    "Search",
    "Watchlist",
    "Monitor",
    "Quote",
    "Screener",
    "Analysis",
    "FX",
    "Commodities",
    "Fixed Income",
  ];

  let idx = 3;
  for (const section of sections) {
    const clickResult = await evalJS(
      page,
      `
      (function() {
        var all = document.querySelectorAll('a, button, span, div, li, td');
        for (var i = 0; i < all.length; i++) {
          var txt = (all[i].textContent || '').trim();
          if (txt.toLowerCase() === '${section.toLowerCase()}' ||
              (txt.toLowerCase().indexOf('${section.toLowerCase()}') >= 0 && txt.length < 30)) {
            all[i].click();
            return 'clicked: ' + txt.slice(0, 50);
          }
        }
        return 'not found';
      })()
    `,
    );

    if (clickResult && clickResult !== "not found") {
      console.log(`  ${section}: ${clickResult}`);
      await new Promise((r) => setTimeout(r, 3000));
      const fname = `${String(idx).padStart(2, "0")}-${section.toLowerCase().replace(/\s+/g, "-")}.png`;
      await screenshot(page, fname);
      idx++;
    }
  }

  // Step 5: Final comprehensive screenshot
  console.log("\n5. Final state");
  await screenshot(page, "99-final.png");

  // Extract design analysis
  console.log("\n6. Design analysis...");
  const design = await evalJS(
    page,
    `
    JSON.stringify({
      bgColor: getComputedStyle(document.body || document.documentElement).backgroundColor,
      fgColor: getComputedStyle(document.body || document.documentElement).color,
      fontFamily: getComputedStyle(document.body || document.documentElement).fontFamily,
      fontSize: getComputedStyle(document.body || document.documentElement).fontSize,
      totalElements: document.querySelectorAll('*').length,
      tables: document.querySelectorAll('table').length,
      images: document.querySelectorAll('img').length,
      inputs: document.querySelectorAll('input').length,
      buttons: document.querySelectorAll('button').length,
    })
  `,
  );
  if (design) {
    const d = JSON.parse(design);
    console.log(`  Background: ${d.bgColor}`);
    console.log(`  Text color: ${d.fgColor}`);
    console.log(`  Font: ${d.fontFamily} @ ${d.fontSize}`);
    console.log(`  Elements: ${d.totalElements}, Tables: ${d.tables}, Images: ${d.images}`);
  }

  page.close();
  console.log(`\nDone! Screenshots saved to: ${SCREENSHOTS_DIR}`);
}

main().catch(console.error);

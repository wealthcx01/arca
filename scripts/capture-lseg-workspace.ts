/**
 * Capture LSEG Workspace UI screenshots via CDP.
 * Requires LSEG Workspace running with --remote-debugging-port=9222
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CDP_URL = "http://localhost:9222";
const SCREENSHOTS_DIR = join(import.meta.dir, "..", "screenshots", "lseg-reference");

interface CDPTarget {
  id: string;
  title: string;
  url: string;
  type: string;
  webSocketDebuggerUrl?: string;
}

function captureTarget(target: CDPTarget, filename: string): Promise<boolean> {
  if (!target.webSocketDebuggerUrl) {
    console.log(`    No WS URL for ${target.title}`);
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const wsUrl = target.webSocketDebuggerUrl!;
    console.log(`    Connecting to ${wsUrl.slice(0, 80)}...`);
    const ws = new WebSocket(wsUrl);
    let msgId = 0;
    const timeout = setTimeout(() => {
      console.log(`    Timeout for ${target.title}`);
      try {
        ws.close();
      } catch {}
      resolve(false);
    }, 20000);

    ws.onopen = () => {
      console.log("    Connected, enabling Page domain...");
      // First enable Page domain
      ws.send(JSON.stringify({ id: ++msgId, method: "Page.enable", params: {} }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id === 1) {
        // Page.enable response, now capture
        console.log("    Page enabled, capturing screenshot...");
        ws.send(
          JSON.stringify({
            id: ++msgId,
            method: "Page.captureScreenshot",
            params: { format: "png" },
          }),
        );
      } else if (msg.id === 2) {
        if (msg.result?.data) {
          const buffer = Buffer.from(msg.result.data, "base64");
          writeFileSync(join(SCREENSHOTS_DIR, filename), buffer);
          console.log(`    Saved ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        } else {
          console.log("    Screenshot error:", JSON.stringify(msg.error || msg).slice(0, 200));
          clearTimeout(timeout);
          ws.close();
          resolve(false);
        }
      }
    };

    ws.onerror = (e) => {
      console.log(`    WS error for ${target.title}:`, e);
      clearTimeout(timeout);
      resolve(false);
    };

    ws.onclose = () => {
      clearTimeout(timeout);
    };
  });
}

async function main() {
  if (!existsSync(SCREENSHOTS_DIR)) {
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  console.log("Fetching LSEG Workspace CDP targets...\n");
  const resp = await fetch(`${CDP_URL}/json`);
  const targets: CDPTarget[] = await resp.json();

  const pages = targets.filter((t) => t.type === "page");
  console.log(`Found ${pages.length} page targets:`);
  for (const p of pages) {
    console.log(`  "${p.title}" [ws: ${p.webSocketDebuggerUrl ? "yes" : "NO"}]`);
  }

  console.log("\n--- Capturing screenshots ---\n");

  for (const page of pages) {
    if (
      !page.title ||
      page.title === "Renderer service host" ||
      page.title === "Client Service Module Starter"
    ) {
      continue;
    }

    const safeName = page.title
      .replace(/[^a-zA-Z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase()
      .slice(0, 50);
    const filename = `lseg-${safeName}.png`;

    console.log(`\n  Capturing: "${page.title}"`);
    const success = await captureTarget(page, filename);
    if (!success) {
      console.log(`  FAILED: ${page.title}`);
    }
  }

  console.log(`\n\nDone. Screenshots in: ${SCREENSHOTS_DIR}`);
}

main().catch(console.error);

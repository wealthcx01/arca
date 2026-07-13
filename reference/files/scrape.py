"""
TRKD / Refinitiv Market Monitor Asia - Full Stack Reverse Engineering Scraper
=============================================================================
Logs in with Playwright, captures all network traffic, WebSockets, JS bundles,
and exports a structured API surface map.

Usage:
    python scrape.py

Output:
    output/har_export.json       - Full HTTP Archive of all requests/responses
    output/api_surface.json      - Structured API endpoint map
    output/websockets.json       - WebSocket frames captured
    output/js_bundles/           - Downloaded JS files for analysis
    output/source_maps/          - Source maps if found
    output/screenshots/          - Screenshots at key stages
    output/report.md             - Human-readable summary report
"""

import asyncio
import json
import os
import re
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse, urljoin

from playwright.async_api import async_playwright, Request, Response, WebSocket

# ── Config ─────────────────────────────────────────────────────────────────────
BASE_URL    = "https://innov.trkd-hs.com/tha_desktop/login"
USERNAME    = "u0001"
PASSWORD    = "u0001"
OUTPUT_DIR  = Path("output")
TIMEOUT_MS  = 30_000   # 30s page timeout
IDLE_MS     = 5_000    # wait for network idle after login

# ── Storage ─────────────────────────────────────────────────────────────────────
captured_requests: list[dict]   = []
captured_responses: list[dict]  = []
captured_ws_frames: list[dict]  = []
js_urls: set[str]               = set()
source_map_urls: set[str]       = set()


# ── Helpers ─────────────────────────────────────────────────────────────────────

def make_dirs():
    for d in ["", "js_bundles", "source_maps", "screenshots"]:
        (OUTPUT_DIR / d).mkdir(parents=True, exist_ok=True)


def safe_json(data) -> str:
    return json.dumps(data, indent=2, ensure_ascii=False, default=str)


def classify_endpoint(url: str) -> str:
    u = url.lower()
    if any(x in u for x in ["ws://", "wss://"]):   return "websocket"
    if any(x in u for x in ["/api/", "/rest/", "/v1/", "/v2/", "/v3/"]): return "rest_api"
    if any(x in u for x in [".asmx", "/soap", "wsdl"]):                  return "soap"
    if any(x in u for x in [".js", ".jsx", ".ts"]):                      return "javascript"
    if any(x in u for x in [".css", ".png", ".jpg", ".svg", ".ico"]):    return "static_asset"
    if "/login" in u or "/auth" in u or "/token" in u:                   return "auth"
    return "other"


async def on_request(request: Request):
    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "method":    request.method,
        "url":       request.url,
        "type":      classify_endpoint(request.url),
        "resource_type": request.resource_type,
        "headers":   dict(request.headers),
        "post_data": request.post_data,
    }
    captured_requests.append(entry)

    # Track JS files for later download
    url = request.url
    if re.search(r'\.js(\?|$)', url) and "tha_desktop" in url:
        js_urls.add(url)


async def on_response(response: Response):
    url = response.url
    entry = {
        "timestamp":   datetime.utcnow().isoformat(),
        "url":         url,
        "status":      response.status,
        "type":        classify_endpoint(url),
        "headers":     dict(response.headers),
        "body_size":   None,
        "body_sample": None,
    }

    # Capture body for non-static responses
    content_type = response.headers.get("content-type", "")
    if any(x in content_type for x in ["json", "xml", "text/plain"]):
        try:
            body = await response.body()
            entry["body_size"] = len(body)
            text = body.decode("utf-8", errors="replace")
            entry["body_sample"] = text[:2000]  # first 2KB

            # Look for source map references
            sm_match = re.search(r'//# sourceMappingURL=(\S+)', text)
            if sm_match:
                sm_path = sm_match.group(1)
                sm_url  = sm_path if sm_path.startswith("http") else urljoin(url, sm_path)
                source_map_urls.add(sm_url)
        except Exception:
            pass

    captured_responses.append(entry)


def on_websocket(ws: WebSocket):
    print(f"  [WS] Connection opened: {ws.url}")

    def on_frame_sent(payload):
        captured_ws_frames.append({
            "direction": "sent",
            "timestamp": datetime.utcnow().isoformat(),
            "url":       ws.url,
            "payload":   payload[:1000] if isinstance(payload, str) else repr(payload[:500]),
        })

    def on_frame_received(payload):
        captured_ws_frames.append({
            "direction": "received",
            "timestamp": datetime.utcnow().isoformat(),
            "url":       ws.url,
            "payload":   payload[:1000] if isinstance(payload, str) else repr(payload[:500]),
        })
        print(f"  [WS ←] {str(payload)[:120]}")

    ws.on("framesent",     on_frame_sent)
    ws.on("framereceived", on_frame_received)
    ws.on("close",         lambda: print(f"  [WS] Closed: {ws.url}"))


# ── Core scraper ────────────────────────────────────────────────────────────────

async def run():
    make_dirs()
    print("=" * 60)
    print("TRKD Refinitiv Market Monitor - Reverse Engineering Scraper")
    print("=" * 60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            ignore_https_errors=True,
        )

        # Enable HAR recording
        await context.tracing.start(screenshots=True, snapshots=True, sources=True)

        page = await context.new_page()

        # Wire up event listeners
        page.on("request",   lambda r: asyncio.ensure_future(on_request(r)))
        page.on("response",  lambda r: asyncio.ensure_future(on_response(r)))
        page.on("websocket", on_websocket)

        # ── Step 1: Load login page ────────────────────────────────────────────
        print("\n[1] Loading login page...")
        await page.goto(BASE_URL, timeout=TIMEOUT_MS, wait_until="domcontentloaded")
        await page.screenshot(path=str(OUTPUT_DIR / "screenshots/01_login_page.png"))

        # Dump login page HTML
        html = await page.content()
        (OUTPUT_DIR / "login_page.html").write_text(html, encoding="utf-8")
        print(f"    Login page HTML: {len(html)} chars")

        # ── Step 2: Inspect login form ─────────────────────────────────────────
        print("\n[2] Analysing login form structure...")
        form_data = await page.evaluate("""
            () => {
                const forms = Array.from(document.forms).map(f => ({
                    action: f.action,
                    method: f.method,
                    fields: Array.from(f.elements).map(el => ({
                        name: el.name, type: el.type, id: el.id,
                        placeholder: el.placeholder
                    }))
                }));
                const inputs = Array.from(document.querySelectorAll('input')).map(el => ({
                    name: el.name, type: el.type, id: el.id, placeholder: el.placeholder
                }));
                return { forms, inputs };
            }
        """)
        print(f"    Forms found: {len(form_data['forms'])}")
        print(f"    Inputs found: {len(form_data['inputs'])}")
        (OUTPUT_DIR / "form_structure.json").write_text(safe_json(form_data))

        # ── Step 3: Login ──────────────────────────────────────────────────────
        print("\n[3] Attempting login...")
        try:
            # Try common field selectors
            for selector in ['#username', '[name="username"]', '[name="user"]',
                             '[type="text"]', '#user', '#loginId']:
                if await page.query_selector(selector):
                    await page.fill(selector, USERNAME)
                    print(f"    Filled username via: {selector}")
                    break

            for selector in ['#password', '[name="password"]', '[name="pass"]',
                             '[type="password"]']:
                if await page.query_selector(selector):
                    await page.fill(selector, PASSWORD)
                    print(f"    Filled password via: {selector}")
                    break

            # Submit
            for selector in ['[type="submit"]', '#login', '#loginBtn',
                             'button[type="submit"]', '.login-btn']:
                if await page.query_selector(selector):
                    await page.click(selector)
                    print(f"    Clicked submit via: {selector}")
                    break
            else:
                await page.keyboard.press("Enter")
                print("    Submitted via Enter key")

        except Exception as e:
            print(f"    Login error: {e}")

        # ── Step 4: Wait for app to load ───────────────────────────────────────
        print("\n[4] Waiting for application to load...")
        try:
            await page.wait_for_load_state("networkidle", timeout=IDLE_MS)
        except Exception:
            await asyncio.sleep(5)  # fallback

        await page.screenshot(path=str(OUTPUT_DIR / "screenshots/02_post_login.png"))
        post_login_url = page.url
        print(f"    Current URL: {post_login_url}")
        print(f"    Title: {await page.title()}")

        post_html = await page.content()
        (OUTPUT_DIR / "post_login_page.html").write_text(post_html, encoding="utf-8")

        # ── Step 5: Capture cookies & storage ─────────────────────────────────
        print("\n[5] Capturing session data...")
        cookies = await context.cookies()
        (OUTPUT_DIR / "cookies.json").write_text(safe_json(cookies))
        print(f"    Cookies captured: {len(cookies)}")

        storage = await page.evaluate("""
            () => ({
                localStorage:  Object.fromEntries(Object.entries(localStorage)),
                sessionStorage: Object.fromEntries(Object.entries(sessionStorage))
            })
        """)
        (OUTPUT_DIR / "browser_storage.json").write_text(safe_json(storage))
        print(f"    localStorage keys:   {len(storage['localStorage'])}")
        print(f"    sessionStorage keys: {len(storage['sessionStorage'])}")

        # ── Step 6: Explore the app ────────────────────────────────────────────
        print("\n[6] Exploring application structure...")
        await asyncio.sleep(3)

        # Grab all visible links/navigation
        nav_data = await page.evaluate("""
            () => ({
                links: Array.from(document.querySelectorAll('a[href]'))
                    .map(a => ({ text: a.innerText.trim(), href: a.href }))
                    .filter(a => a.text || a.href),
                buttons: Array.from(document.querySelectorAll('button, [role="button"]'))
                    .map(b => ({ text: b.innerText.trim(), id: b.id, class: b.className })),
                iframes: Array.from(document.querySelectorAll('iframe'))
                    .map(f => ({ src: f.src, id: f.id, name: f.name })),
            })
        """)
        (OUTPUT_DIR / "app_structure.json").write_text(safe_json(nav_data))
        print(f"    Links:   {len(nav_data['links'])}")
        print(f"    Buttons: {len(nav_data['buttons'])}")
        print(f"    iFrames: {len(nav_data['iframes'])}")

        # Screenshot full page
        await page.screenshot(
            path=str(OUTPUT_DIR / "screenshots/03_app_full.png"),
            full_page=True
        )

        # Wait a bit more to catch any delayed API calls
        print("\n[7] Waiting for additional API calls (10s)...")
        await asyncio.sleep(10)

        # ── Step 7: Try to click around / trigger data loads ───────────────────
        print("\n[8] Triggering UI interactions...")
        clickable = ['[role="tab"]', '.tab', '.menu-item', '.nav-item',
                     'li[data-tab]', '.sidebar-item']
        for sel in clickable:
            elements = await page.query_selector_all(sel)
            for i, el in enumerate(elements[:3]):  # first 3 of each type
                try:
                    await el.click()
                    await asyncio.sleep(1.5)
                    await page.screenshot(
                        path=str(OUTPUT_DIR / f"screenshots/interaction_{sel.replace('[','').replace(']','').replace('\"','').replace('=','_')}_{i}.png")
                    )
                except Exception:
                    pass

        await asyncio.sleep(5)

        # ── Step 8: Download JS bundles ────────────────────────────────────────
        print(f"\n[9] Downloading {len(js_urls)} JS files for analysis...")
        import aiohttp, ssl
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE

        cookie_header = "; ".join([f"{c['name']}={c['value']}" for c in cookies])

        async with aiohttp.ClientSession() as session:
            for i, js_url in enumerate(list(js_urls)[:20]):  # cap at 20
                try:
                    async with session.get(
                        js_url,
                        headers={"Cookie": cookie_header},
                        ssl=ssl_ctx,
                        timeout=aiohttp.ClientTimeout(total=10)
                    ) as resp:
                        if resp.status == 200:
                            content = await resp.text(errors="replace")
                            fname = re.sub(r'[^\w.-]', '_', urlparse(js_url).path.split('/')[-1])
                            (OUTPUT_DIR / "js_bundles" / fname).write_text(content[:500_000])
                            print(f"    [{i+1}] {fname} ({len(content):,} chars)")

                            # Check for source map
                            sm = re.search(r'//# sourceMappingURL=(\S+)', content)
                            if sm:
                                sm_url = sm.group(1)
                                if not sm_url.startswith("http"):
                                    sm_url = urljoin(js_url, sm_url)
                                source_map_urls.add(sm_url)
                                print(f"         → Source map found: {sm_url}")
                except Exception as e:
                    print(f"    Failed: {js_url[:80]} — {e}")

        # ── Step 9: Download source maps ──────────────────────────────────────
        if source_map_urls:
            print(f"\n[10] Downloading {len(source_map_urls)} source maps...")
            async with aiohttp.ClientSession() as session:
                for sm_url in list(source_map_urls)[:10]:
                    try:
                        async with session.get(
                            sm_url,
                            headers={"Cookie": cookie_header},
                            ssl=ssl_ctx,
                            timeout=aiohttp.ClientTimeout(total=15)
                        ) as resp:
                            if resp.status == 200:
                                content = await resp.text(errors="replace")
                                fname = re.sub(r'[^\w.-]', '_', urlparse(sm_url).path.split('/')[-1])
                                (OUTPUT_DIR / "source_maps" / fname).write_text(content)
                                print(f"    Saved: {fname}")
                    except Exception as e:
                        print(f"    Failed: {sm_url[:80]} — {e}")
        else:
            print("\n[10] No source maps found (minified-only deployment)")

        # ── Step 10: Save tracing ──────────────────────────────────────────────
        print("\n[11] Saving Playwright trace...")
        await context.tracing.stop(path=str(OUTPUT_DIR / "trace.zip"))
        print("    trace.zip saved (open with: npx playwright show-trace output/trace.zip)")

        await browser.close()

    # ── Step 11: Build outputs ─────────────────────────────────────────────────
    print("\n[12] Building analysis outputs...")
    await build_outputs()

    print("\n✓ Done. See output/ directory.")


async def build_outputs():
    """Analyse captured data and write structured reports."""

    # Save raw captures
    (OUTPUT_DIR / "raw_requests.json").write_text(safe_json(captured_requests))
    (OUTPUT_DIR / "raw_responses.json").write_text(safe_json(captured_responses))
    (OUTPUT_DIR / "websockets.json").write_text(safe_json(captured_ws_frames))

    # Build API surface map
    api_endpoints: dict[str, dict] = {}
    auth_tokens: list[str] = []

    for req in captured_requests:
        url   = req["url"]
        rtype = req["type"]

        if rtype in ("static_asset", "javascript"):
            continue

        parsed = urlparse(url)
        key    = f"{req['method']} {parsed.scheme}://{parsed.netloc}{parsed.path}"

        if key not in api_endpoints:
            api_endpoints[key] = {
                "method":        req["method"],
                "url":           url,
                "path":          parsed.path,
                "host":          parsed.netloc,
                "type":          rtype,
                "call_count":    0,
                "query_params":  parsed.query,
                "request_headers_sample":  {
                    k: v for k, v in req["headers"].items()
                    if k.lower() in ("content-type", "authorization", "x-access-token",
                                     "x-api-key", "accept", "origin", "referer")
                },
                "post_data_sample": req.get("post_data", "")[:500] if req.get("post_data") else None,
                "responses":     [],
            }
        api_endpoints[key]["call_count"] += 1

        # Extract auth tokens
        for hdr in ("authorization", "x-access-token", "x-api-key"):
            val = req["headers"].get(hdr, "")
            if val and val not in auth_tokens:
                auth_tokens.append(val)

    # Enrich with response data
    for resp in captured_responses:
        url    = resp["url"]
        parsed = urlparse(url)
        # Try to match to an endpoint
        for method in ("GET", "POST", "PUT", "DELETE", "PATCH"):
            key = f"{method} {parsed.scheme}://{parsed.netloc}{parsed.path}"
            if key in api_endpoints:
                api_endpoints[key]["responses"].append({
                    "status":      resp["status"],
                    "content_type": resp["headers"].get("content-type", ""),
                    "body_size":   resp.get("body_size"),
                    "body_sample": resp.get("body_sample", "")[:500] if resp.get("body_sample") else None,
                })
                break

    # Categorise
    categorised = {
        "auth":      [],
        "data_api":  [],
        "websocket": [],
        "soap":      [],
        "other":     [],
    }
    for ep in api_endpoints.values():
        t = ep["type"]
        if t == "auth":            categorised["auth"].append(ep)
        elif t == "rest_api":      categorised["data_api"].append(ep)
        elif t == "websocket":     categorised["websocket"].append(ep)
        elif t == "soap":          categorised["soap"].append(ep)
        else:                      categorised["other"].append(ep)

    api_surface = {
        "summary": {
            "total_requests":    len(captured_requests),
            "total_responses":   len(captured_responses),
            "unique_endpoints":  len(api_endpoints),
            "websocket_frames":  len(captured_ws_frames),
            "auth_tokens_found": len(auth_tokens),
            "js_files_found":    len(js_urls),
            "source_maps_found": len(source_map_urls),
            "captured_at":       datetime.utcnow().isoformat(),
        },
        "auth_tokens": auth_tokens,
        "endpoints": categorised,
        "all_endpoints": list(api_endpoints.values()),
    }

    (OUTPUT_DIR / "api_surface.json").write_text(safe_json(api_surface))

    # ── Markdown Report ────────────────────────────────────────────────────────
    s = api_surface["summary"]
    lines = [
        "# TRKD / Refinitiv Market Monitor Asia — Reverse Engineering Report",
        f"\n**Captured:** {s['captured_at']}  ",
        f"**Target:** https://innov.trkd-hs.com/tha_desktop/\n",
        "## Summary",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Total HTTP requests | {s['total_requests']} |",
        f"| Total HTTP responses | {s['total_responses']} |",
        f"| Unique API endpoints | {s['unique_endpoints']} |",
        f"| WebSocket frames | {s['websocket_frames']} |",
        f"| Auth tokens found | {s['auth_tokens_found']} |",
        f"| JS bundle files | {s['js_files_found']} |",
        f"| Source maps | {s['source_maps_found']} |",
        "\n## Auth Tokens",
    ]

    if auth_tokens:
        for t in auth_tokens:
            lines.append(f"- `{t[:80]}{'...' if len(t) > 80 else ''}`")
    else:
        lines.append("_None captured in request headers — check cookies.json for session tokens_")

    for section_name, section_label in [
        ("auth", "Auth Endpoints"),
        ("data_api", "Data API Endpoints"),
        ("websocket", "WebSocket Connections"),
        ("soap", "SOAP Endpoints"),
        ("other", "Other Endpoints"),
    ]:
        eps = categorised[section_name]
        if not eps:
            continue
        lines.append(f"\n## {section_label} ({len(eps)})")
        for ep in sorted(eps, key=lambda x: x['call_count'], reverse=True):
            lines.append(f"\n### `{ep['method']} {ep['path']}`")
            lines.append(f"- **Host:** `{ep['host']}`")
            lines.append(f"- **Calls:** {ep['call_count']}")
            if ep.get("query_params"):
                lines.append(f"- **Query params:** `{ep['query_params'][:200]}`")
            if ep.get("post_data_sample"):
                lines.append(f"- **Request body sample:**\n  ```\n  {ep['post_data_sample'][:300]}\n  ```")
            if ep.get("responses"):
                r = ep["responses"][0]
                lines.append(f"- **Response status:** {r['status']}")
                lines.append(f"- **Content-Type:** `{r.get('content_type','')}`")
                if r.get("body_sample"):
                    lines.append(f"- **Response sample:**\n  ```\n  {r['body_sample'][:400]}\n  ```")

    lines += [
        "\n## WebSocket Frames",
        f"Total frames: {len(captured_ws_frames)}",
    ]
    for frame in captured_ws_frames[:20]:
        lines.append(f"\n**[{frame['direction'].upper()}]** `{frame['url']}`")
        lines.append(f"```\n{frame['payload'][:300]}\n```")

    lines += [
        "\n## Files",
        "| File | Description |",
        "|------|-------------|",
        "| `cookies.json` | Session cookies after login |",
        "| `browser_storage.json` | localStorage + sessionStorage |",
        "| `raw_requests.json` | All HTTP requests with headers |",
        "| `raw_responses.json` | All HTTP responses with body samples |",
        "| `api_surface.json` | Structured endpoint map |",
        "| `js_bundles/` | Downloaded JS bundles |",
        "| `source_maps/` | Source maps (if found) |",
        "| `screenshots/` | Screenshots at each stage |",
        "| `trace.zip` | Playwright trace (full replay) |",
        "\n## Next Steps",
        "1. Open `trace.zip` with `npx playwright show-trace output/trace.zip` for full session replay",
        "2. Check `cookies.json` for session token names to use in direct API calls",
        "3. Look at `data_api` endpoints in `api_surface.json` — try calling them with curl + the session cookie",
        "4. If source maps found, use `source-map` npm package to reconstruct original source",
        "5. Search JS bundles for strings like `api/`, `endpoint`, `ws://`, `wss://` for hidden routes",
    ]

    (OUTPUT_DIR / "report.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"    api_surface.json: {len(api_endpoints)} unique endpoints")
    print(f"    report.md: written")


if __name__ == "__main__":
    asyncio.run(run())

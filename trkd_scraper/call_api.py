"""
call_api.py
===========
Once scrape.py has revealed endpoints and session tokens, use this to
call the TRKD backend APIs directly — no browser needed.

Usage:
    python call_api.py

Edit SESSION_COOKIE / AUTH_TOKEN below after running scrape.py
and checking output/cookies.json and output/api_surface.json.
"""

import asyncio
import json
import ssl
from pathlib import Path

import aiohttp

OUTPUT_DIR = Path("output")

# ── Fill these in after running scrape.py ─────────────────────────────────────
# Check output/cookies.json for the right cookie name/value
SESSION_COOKIE = ""   # e.g. "JSESSIONID=abc123" or "token=eyJ..."

# Check output/api_surface.json auth section
AUTH_TOKEN = ""       # e.g. "Bearer eyJ..." 

# Base URL of the app
BASE_URL = "https://innov.trkd-hs.com"


async def call_endpoints():
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    headers = {"User-Agent": "Mozilla/5.0"}
    if SESSION_COOKIE:
        headers["Cookie"] = SESSION_COOKIE
    if AUTH_TOKEN:
        headers["Authorization"] = AUTH_TOKEN

    # Load discovered endpoints
    api_path = OUTPUT_DIR / "api_surface.json"
    if not api_path.exists():
        print("Run scrape.py first to discover endpoints.")
        return

    api_data = json.loads(api_path.read_text())
    data_endpoints = api_data["endpoints"].get("data_api", [])

    print(f"Found {len(data_endpoints)} data API endpoints to probe\n")

    results = []
    async with aiohttp.ClientSession(headers=headers) as session:
        for ep in data_endpoints:
            url = ep["url"]
            method = ep["method"]
            print(f"→ {method} {url[:80]}")

            try:
                req_kwargs = {"ssl": ssl_ctx, "timeout": aiohttp.ClientTimeout(total=10)}
                if ep.get("post_data_sample") and method in ("POST", "PUT"):
                    req_kwargs["data"] = ep["post_data_sample"]

                async with getattr(session, method.lower())(url, **req_kwargs) as resp:
                    body = await resp.text(errors="replace")
                    print(f"  {resp.status} — {len(body)} chars")
                    results.append({
                        "url": url,
                        "method": method,
                        "status": resp.status,
                        "response_headers": dict(resp.headers),
                        "body": body[:5000],
                    })

            except Exception as e:
                print(f"  ERROR: {e}")
                results.append({"url": url, "method": method, "error": str(e)})

    (OUTPUT_DIR / "direct_api_results.json").write_text(
        json.dumps(results, indent=2, ensure_ascii=False, default=str)
    )
    print(f"\n✓ Results saved to output/direct_api_results.json")


if __name__ == "__main__":
    asyncio.run(call_endpoints())

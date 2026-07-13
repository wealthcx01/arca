# TRKD / Refinitiv Market Monitor Asia — Reverse Engineering Toolkit

## What this does

Three-stage reverse engineering of a Refinitiv hosted web application:

1. **`scrape.py`** — Playwright-based authenticated session scraper
   - Logs in, captures all network traffic (HTTP + WebSocket)
   - Downloads JS bundles and source maps
   - Exports screenshots, cookies, HAR trace
   - Produces `output/api_surface.json` and `output/report.md`

2. **`analyse_bundles.py`** — JS bundle miner
   - Scans downloaded bundles for API paths, WS URLs, field names, RIC codes
   - Produces `output/bundle_analysis.md`

3. **`call_api.py`** — Direct API caller
   - Use after steps 1+2 to call discovered endpoints directly without the browser

---

## Setup

```bash
pip install playwright aiohttp --break-system-packages
playwright install chromium
```

## Run

```bash
# Stage 1: scrape + capture
python scrape.py

# Stage 2: mine JS bundles
python analyse_bundles.py

# Stage 3: fill in session token from output/cookies.json, then:
python call_api.py
```

## Output files

| File | Description |
|------|-------------|
| `output/report.md` | Human-readable summary of all findings |
| `output/api_surface.json` | Structured endpoint map with request/response samples |
| `output/bundle_analysis.md` | API paths, field names, RICs found in JS |
| `output/cookies.json` | Session cookies (contains auth token) |
| `output/browser_storage.json` | localStorage + sessionStorage |
| `output/raw_requests.json` | Every HTTP request with headers |
| `output/raw_responses.json` | Every HTTP response with body sample |
| `output/websockets.json` | WebSocket frames captured |
| `output/js_bundles/` | Downloaded JS files |
| `output/source_maps/` | Source maps if found |
| `output/screenshots/` | Visual record of each stage |
| `output/trace.zip` | Full Playwright trace replay |

## View full session replay

```bash
npx playwright show-trace output/trace.zip
```

## Typical findings for a TRKD/Refinitiv app

- **Auth**: Session cookie (JSESSIONID) or JWT Bearer token
- **Data APIs**: REST endpoints returning JSON market data
- **Streaming**: WebSocket or SSE for real-time price feeds
- **Legacy SOAP**: `.asmx` or `wsdl` endpoints (common in older TRKD stack)
- **RIC codes**: Thomson Reuters Instrument Codes embedded in JS config

## Notes for Giovanni / Genesis integration

Once endpoints are mapped, you can:
1. Call market data APIs directly with `requests` / `aiohttp`
2. Subscribe to WebSocket feeds for real-time data
3. Compare data schema with Eikon Data API / EDP to assess overlap
4. Evaluate replication potential vs. licensed data access

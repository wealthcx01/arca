"""
analyse_bundles.py
==================
Run AFTER scrape.py. Mines the downloaded JS bundles for:
  - API endpoint strings
  - WebSocket URLs
  - Environment config / feature flags
  - Auth patterns (JWT, API key headers)
  - Data schemas / field names
  - Third-party service references

Usage:
    python analyse_bundles.py
"""

import json
import re
from pathlib import Path

OUTPUT_DIR  = Path("output")
BUNDLES_DIR = OUTPUT_DIR / "js_bundles"

PATTERNS = {
    "api_paths":       re.compile(r'["\`](/(?:api|rest|v\d|service|data|market|quote|stream|auth|user)[/\w\-\.{}:]+)["\`]'),
    "ws_urls":         re.compile(r'["\`](wss?://[^\s"\'`>]+)["\`]'),
    "http_urls":       re.compile(r'["\`](https?://[^\s"\'`>]{10,})["\`]'),
    "jwt_patterns":    re.compile(r'(?:Bearer|JWT|Authorization)[:\s]+["\`]?([A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*)'),
    "api_key_headers": re.compile(r'["\`](x-api-key|x-access-token|x-auth-token|apikey|api_key|access_token)["\`]', re.I),
    "env_config":      re.compile(r'(?:BASE_URL|API_URL|WS_URL|ENDPOINT|HOST|PORT)\s*[:=]\s*["\`]([^"\'`\s]{5,})["\`]', re.I),
    "field_names":     re.compile(r'"([a-zA-Z]{2,30}(?:Price|Volume|Bid|Ask|Open|High|Low|Close|Last|Change|Pct|Yield|Spread|Nav|Ric|Ticker|Symbol|Isin|Sedol|Id|Code|Name|Date|Time))"'),
    "ric_patterns":    re.compile(r'["\`]([A-Z0-9]+\.[A-Z]{1,4})["\`]'),  # Thomson Reuters RIC codes
    "soap_actions":    re.compile(r'SOAPAction|soapAction|xmlns:tns["\`]?\s*[:=]\s*["\`]([^"\'`\s]+)["\`]', re.I),
}

def analyse():
    results: dict[str, set] = {k: set() for k in PATTERNS}
    files_analysed = 0

    if not BUNDLES_DIR.exists():
        print("No js_bundles/ directory found. Run scrape.py first.")
        return

    for js_file in sorted(BUNDLES_DIR.glob("*.js")):
        content = js_file.read_text(encoding="utf-8", errors="replace")
        files_analysed += 1
        print(f"Analysing: {js_file.name} ({len(content):,} chars)")

        for key, pattern in PATTERNS.items():
            matches = pattern.findall(content)
            results[key].update(matches)

    # Also scan api_surface.json for additional context
    api_surface_path = OUTPUT_DIR / "api_surface.json"
    if api_surface_path.exists():
        api_data = json.loads(api_surface_path.read_text())
        for ep in api_data.get("all_endpoints", []):
            body = ep.get("post_data_sample") or ""
            resp_sample = ""
            for r in ep.get("responses", []):
                resp_sample += (r.get("body_sample") or "")
            for key, pattern in PATTERNS.items():
                results[key].update(pattern.findall(body + resp_sample))

    # Serialise sets to sorted lists
    output = {k: sorted(v) for k, v in results.items()}
    output["_meta"] = {"files_analysed": files_analysed}

    # Write JSON
    out_path = OUTPUT_DIR / "bundle_analysis.json"
    out_path.write_text(json.dumps(output, indent=2, ensure_ascii=False))

    # Write readable report
    report_lines = [
        "# JS Bundle Analysis\n",
        f"Files analysed: {files_analysed}\n",
    ]
    labels = {
        "api_paths":       "API Path Strings",
        "ws_urls":         "WebSocket URLs",
        "http_urls":       "HTTP URLs",
        "api_key_headers": "Auth Header Names",
        "env_config":      "Environment Config Values",
        "field_names":     "Market Data Field Names",
        "ric_patterns":    "Possible RIC Codes",
        "soap_actions":    "SOAP Actions / Namespaces",
    }
    for key, label in labels.items():
        items = output.get(key, [])
        if not items:
            continue
        report_lines.append(f"\n## {label} ({len(items)})\n")
        for item in items[:100]:  # cap at 100 per section
            report_lines.append(f"- `{item}`")

    (OUTPUT_DIR / "bundle_analysis.md").write_text("\n".join(report_lines))

    print(f"\n✓ bundle_analysis.json and bundle_analysis.md written to output/")
    print("\nTop findings:")
    for key, label in labels.items():
        count = len(output.get(key, []))
        if count:
            print(f"  {label}: {count}")

if __name__ == "__main__":
    analyse()

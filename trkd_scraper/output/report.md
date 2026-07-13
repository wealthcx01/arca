# TRKD / Refinitiv Market Monitor Asia — Reverse Engineering Report

**Captured:** 2026-03-13T03:37:39.666844  
**Target:** https://innov.trkd-hs.com/tha_desktop/

## Summary
| Metric | Value |
|--------|-------|
| Total HTTP requests | 155 |
| Total HTTP responses | 155 |
| Unique API endpoints | 51 |
| WebSocket frames | 0 |
| Auth tokens found | 0 |
| JS bundle files | 14 |
| Source maps | 0 |

## Auth Tokens
_None captured in request headers — check cookies.json for session tokens_

## Auth Endpoints (2)

### `GET /tha_desktop/login`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `POST /tha_desktop24/loginauth`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Request body sample:**
  ```
  username=u0001&password=u0001&version=&lang=en&brand=
  ```
- **Response status:** 302
- **Content-Type:** `text/html;charset=UTF-8`

## Other Endpoints (49)

### `GET /tha_desktop24_data/data/newslistdata`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 14
- **Query params:** `listtype=news&cpage=markettop&subcat1=THA_market_summary&recperpage=7&qid=1773372927137&lang=en&snap=1`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24_data/data/assetinfolistdata`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 6
- **Query params:** `qid=1773372923882&lang=en&snap=1`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /jds/res`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 5
- **Query params:** `token=687ba9b3dacff0f7f9f01e638e340b6f0331bafc2d25424e581d8d7e8029cfd385c191871bab7184ff26207ac8d28e324fa8fb7c29b31a78adb8a2538532895b`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `POST /jds/req`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 3
- **Request body sample:**
  ```
  ts=1773372925370&action=0&ric=IDN_RDF%2C0100.HK%2C6%2C16%2C18%2C21%2C79%2C1465%2C3265%2C3372%3BIDN_RDF%2C0700.HK%2C6%2C16%2C18%2C21%2C79%2C1465%2C3372%3BIDN_RDF%2C.SETI%2C6%2C11%2C21%2C56%2C79%2C1465%2C3372%3BIDN_RDF%2C.STI%2C6%2C11%2C21%2C56%2C79%2C1465%2C3372%3BIDN_RDF%2CTHB%3D%2C11%2C22%2C56&toke
  ```
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24_data/sschart/render_ta`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 3
- **Query params:** `width=624&height=168&ta=&span=MINUTE_5&code=.SETI&instrument=&type=LINE&caption=&ts=1773372927944&imageOnly=true&dp=-1&element=1773372927138&assettype=EQTYIDX&cc=THA&period=DAY_1&theme=theme-black&lan`
- **Response status:** 200
- **Content-Type:** `text/plain;charset=utf-8`
- **Response sample:**
  ```
  {"data":{"element":"1773372927138","imageOnly":true,"uuid":"6b5f5bef-3971-4835-8689-b8eab36fcb61"},"qid":"1773372927944"}

  ```

### `GET /tha_desktop24_data/data/ecilistdata`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 3
- **Query params:** `listtype=eci&cpage=markettop&subcat1=GL&subcat2=ECILISTBYTOTDAY&subcat3=TODAY&subcat4=2&recperpage=5&pn=1&qid=1773372927600&lang=en&snap=1`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24_data/sschart/chart_img.gif`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 3
- **Query params:** `uuid=6b5f5bef-3971-4835-8689-b8eab36fcb61&width=624&height=168&theme=theme-black&lang=en&span=MINUTE_5&code=.SETI&assettype=EQTYIDX&cc=THA`
- **Response status:** 200
- **Content-Type:** `image/gif`

### `GET /tha_desktop24_data/data/stocksectorindexlistdata`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 2
- **Query params:** `listtype=EQTYIDX&cpage=markettop&subcat1=GL&subcat2=stockindex&qid=1773372927136&lang=en&snap=1`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24/ui/home`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `&lang=en`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24/img/headerbox/header.gif`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Response status:** 200
- **Content-Type:** `image/gif`

### `GET /tha_desktop24/img/headerbox/separator.gif`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Response status:** 200
- **Content-Type:** `image/gif`

### `GET /tha_desktop24/img/headerbox/left_arrow.gif`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Response status:** 200
- **Content-Type:** `image/gif`

### `GET /tha_desktop24/img/headerbox/right_arrow.gif`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Response status:** 200
- **Content-Type:** `image/gif`

### `GET /tha_desktop24/img/headerbox/refresh_btn.gif`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Response status:** 200
- **Content-Type:** `image/gif`

### `GET /tha_desktop24/img/headerbox/setting_icon.gif`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Response status:** 200
- **Content-Type:** `image/gif`

### `GET /tha_desktop24/img/widget/progress.gif`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Response status:** 200
- **Content-Type:** `image/gif`

### `GET /tha_desktop24/img/headerbox/left_arrow_disable.gif`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Response status:** 200
- **Content-Type:** `image/gif`

### `GET /tha_desktop24/img/headerbox/right_arrow_disable.gif`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Response status:** 200
- **Content-Type:** `image/gif`

### `GET /tha_desktop24_data/data/pricealertsettingaction`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `action=get&sortcol=alert_time&sortdir=desc&qid=1773372924116&lang=en&snap=1`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24_data/data/favoritepageeditaction`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `action=get&qid=1773372924126&lang=en&snap=1`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24/img/powersearch/powersearch_magnifier.gif`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Response status:** 200
- **Content-Type:** `image/gif`

### `GET /tha_desktop24_data/data/homepagesettingaction`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `action=get&qid=1773372924126&lang=en&snap=1`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24/uicomp/quotemonitor`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `lang=en&brand=`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24/uicomp/markettop`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `lang=en&brand=`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24/uicomp/stockfullquote`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `lang=en&brand=`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24/uicomp/stocklv2tmpl`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `lang=en&brand=`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24/uicomp/quoteboxtmpl`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `lang=en&brand=`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24/img/space.gif`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Response status:** 200
- **Content-Type:** `image/gif`

### `GET /tha_desktop24/img/toolbutton/chartArrow.gif`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Response status:** 200
- **Content-Type:** `image/gif`

### `GET /tha_desktop24/uicomp/fundfullquote`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `lang=en&brand=`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24/uicomp/funddivcomptmpl`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `lang=en&brand=`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24/uicomp/prodcomptmpl`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `lang=en&brand=`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24/img/lipper/asset_type/OTHER.gif`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Response status:** 200
- **Content-Type:** `image/gif`

### `GET /tha_desktop24_data/data/superwatchlistgetlistdata`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `qid=1773372926569&lang=en&snap=1`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24_data/data/govbondperioddata`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `country=GL&qid=1773372926602&lang=en&snap=1`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24/img/sschart/space.gif`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Response status:** 200
- **Content-Type:** `image/gif`

### `GET /tha_desktop24_data/data/ecicategorydata`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `country=GL&qid=1773372926605&lang=en&snap=1`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24_data/data/stockquotedata`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `template=lv2&ric=undefined&cc=&assettype=&qid=1773372926945&lang=en&snap=1`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24_data/data/navhistorylogdata`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `pid=markettop&cc=GL&tab=`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24_data/data/fxlistdata`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `listtype=CURR&cpage=markettop&subcat1=GL&subcat2=THB&qid=1773372927137&lang=en&snap=1`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24_data/data/govbondlistdata`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `listtype=GBND&cpage=markettop&subcat1=GL&subcat2=10Y&qid=1773372927137&lang=en&snap=1`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24_data/data/localtimedata`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `qid=1773372927137&lang=en&snap=1`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24_data/data/marketstatlistdata`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `listtype=marketstat&cpage=markettop&subcat1=THA&qid=1773372927137&lang=en&snap=1`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24_data/data/interestratelistdata`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `listtype=interestrate&cpage=markettop&subcat1=LIBOR&subcat2=GL&qid=1773372927137&lang=en&snap=1`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24_data/data/stocksectorindexquotedata`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Query params:** `ric=.SETI&assettype=EQTYIDX&template=minimini&cc=JPN&qid=1773372927139&lang=en&snap=1`
- **Response status:** 200
- **Content-Type:** `text/html;charset=UTF-8`

### `GET /tha_desktop24/img/tick/flash_arrow_down_inv.gif`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Response status:** 200
- **Content-Type:** `image/gif`

### `GET /tha_desktop24/img/tick/arrow_down_inv.gif`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Response status:** 200
- **Content-Type:** `image/gif`

### `GET /tha_desktop24/img/tick/flash_arrow_up_inv.gif`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Response status:** 200
- **Content-Type:** `image/gif`

### `GET /tha_desktop24/img/tick/arrow_up_inv.gif`
- **Host:** `innov.trkd-hs.com`
- **Calls:** 1
- **Response status:** 200
- **Content-Type:** `image/gif`

## WebSocket Frames
Total frames: 0

## Files
| File | Description |
|------|-------------|
| `cookies.json` | Session cookies after login |
| `browser_storage.json` | localStorage + sessionStorage |
| `raw_requests.json` | All HTTP requests with headers |
| `raw_responses.json` | All HTTP responses with body samples |
| `api_surface.json` | Structured endpoint map |
| `js_bundles/` | Downloaded JS bundles |
| `source_maps/` | Source maps (if found) |
| `screenshots/` | Screenshots at each stage |
| `trace.zip` | Playwright trace (full replay) |

## Next Steps
1. Open `trace.zip` with `npx playwright show-trace output/trace.zip` for full session replay
2. Check `cookies.json` for session token names to use in direct API calls
3. Look at `data_api` endpoints in `api_surface.json` — try calling them with curl + the session cookie
4. If source maps found, use `source-map` npm package to reconstruct original source
5. Search JS bundles for strings like `api/`, `endpoint`, `ws://`, `wss://` for hidden routes
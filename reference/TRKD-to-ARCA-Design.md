# TRKD Market Monitor → ARCA Card Market Monitor — Design Mapping

## TRKD UI Architecture (Scraped from innov.trkd-hs.com)

### Main Navigation Tabs
| TRKD Tab | ID | ARCA Equivalent |
|----------|-----|-----------------|
| **Overview** | `markettop` | **Dashboard** — Portfolio overview with market data panels |
| **Region & Country** | `regioncountrycomparison` | **Sets & Eras** — Browse by Pokemon set, generation, era |
| **Events** | `newsevent` | **Market News** — Price alerts, new releases, reprint announcements |
| **Equity** | `equitymarket` | **Cards** — Individual card data (like single stock view) |
| **FX** | `fxmoneymarket` | **Graded** — PSA/CGC/BGS price tiers (like FX cross-rates) |
| **Quote Monitor** | `quotemonitor` | **Watchlist** — User's tracked cards with live prices |
| **Screener** | `screener` | **Screener** — Filter cards by set, rarity, price range, grade |

### Header Bar (Rolling Ticker)
**TRKD:** Scrolling ticker showing SET Index, STRAITS TIMES, THB/USD with price + change + %change, color-coded (green=up, red=down).

**ARCA:** Scrolling ticker showing top portfolio holdings or market movers:
- `Charizard VMAX 074 | $385.50 | +$12.25 | +3.28%`
- `Pikachu VMAX 044 | $220.00 | -$5.50 | -2.44%`
- `Umbreon VMAX 215 | $198.75 | +$8.00 | +4.19%`

Uses CSS classes: `upval` (green), `downval` (red), `flash` (animation on price change)

### Dashboard Layout (3-Column, TRKD "Market Overview")

#### Left Column — Market Data Panels
| TRKD Panel | API Endpoint | ARCA Panel | ARCA Data |
|------------|-------------|------------|-----------|
| Domestic Indices | `stocksectorindexlistdata` | **Set Performance** | Price indices by Pokemon set (Base Set, Evolving Skies, etc.) |
| Market Stats (Vol/Turnover/MCap) | `marketstatlistdata` | **Portfolio Stats** | Total value, cost basis, P&L, card count |
| Market Summary (News) | `newslistdata` | **Price Alerts** | Cards with significant price movements |
| FX Rates | `fxlistdata` | **Currency Rates** | GBP/USD/EUR/JPY (already have via Frankfurter) |
| Government Bonds | `govbondlistdata` | **Grading Premium** | PSA 10 vs raw price premium by card |
| LIBOR Rates | `interestratelistdata` | *(omit)* | Not applicable |

#### Center Column — Detail Data
| TRKD Panel | API Endpoint | ARCA Panel | ARCA Data |
|------------|-------------|------------|-----------|
| Global Indices | `stocksectorindexlistdata` (Global) | **Top Movers** | Biggest gainers/losers across all cards |
| ECI Calendar | `ecilistdata` | **Upcoming Releases** | New set release dates, promo events |

#### Right Column — Charts & News
| TRKD Panel | API Endpoint | ARCA Panel | ARCA Data |
|------------|-------------|------------|-----------|
| Index Chart (Intraday/Daily/Weekly/Monthly) | `sschart/render_ta` | **Price Chart** | Historical price chart for selected card/set |
| Regional News (US/EU/Asia) | `newslistdata` (by region) | **Market Intel** | TCGPlayer trends, eBay sold comps, market analysis |

### Quote Monitor (Watchlist) Page
**TRKD Structure:**
- List type selector: Watchlist / Recent History / Rankings / Equity Indexes / FX / Govt Bonds / Events
- Sub-type selector: User Watchlist 1-40
- View modes: Full Quote / Compare View / Technical Chart / Time Series
- Actions: Rename, Edit Mode, Print, Remove Selected, Remove All

**ARCA Equivalent:**
- List type: Watchlist / Recent Views / Top Movers / By Set / By Rarity / By Grade
- Sub-type: User watchlists (My Charizards, Vintage Holos, PSA 10 Collection, etc.)
- View modes: Full Quote / Compare / Price Chart / Price History
- Actions: Rename, Edit, Export CSV, Remove

### Screener Page
**TRKD:** Equity Rankings by country — Top Volume, % Gainers, % Losers, Net Gainers, Net Losers, Top Turnover, Year High/Low Change

**ARCA Screener:**
- By Set: Select Pokemon set → Top Gainers, Top Losers, Most Expensive, Most Traded
- By Rarity: Common / Uncommon / Rare / Ultra Rare / Secret Rare / Illustration Rare
- By Grade: PSA 10, PSA 9, CGC 9.5, BGS 10, Raw
- Rankings: Price % Change (7d/30d/90d), Absolute Price, Price vs Average

## API Pattern Mapping

### TRKD Data API Pattern
All data endpoints follow: `GET /tha_desktop24_data/data/{endpoint}?listtype={type}&cpage={page}&subcat1={cat1}&...&qid={queryId}&lang={lang}&snap=1`

### ARCA Equivalent Pattern
`GET /api/market/{endpoint}?type={type}&set={setId}&rarity={rarity}&sort={sort}&limit={n}`

| TRKD Endpoint | ARCA Equivalent |
|---------------|-----------------|
| `newslistdata` | `/api/market/alerts` — Price movement alerts |
| `assetinfolistdata` | `/api/market/cards` — Card list with prices |
| `stocksectorindexlistdata` | `/api/market/sets` — Set-level performance indices |
| `fxlistdata` | `/api/pricing/fx` — Already exists |
| `govbondlistdata` | `/api/market/graded` — Grade premium data |
| `ecilistdata` | `/api/market/calendar` — Release calendar |
| `stockquotedata` | `/api/pricing/{cardId}/conflated` — Full card quote |
| `superwatchlistgetlistdata` | `/api/watchlist` — User watchlists |
| `pricealertsettingaction` | `/api/alerts/settings` — Alert configuration |
| `marketstatlistdata` | `/api/portfolio/{id}` — Portfolio stats |
| `localtimedata` | Client-side |
| `navhistorylogdata` | Client-side (React Router) |

### Streaming Architecture
**TRKD:** Hidden iframe (`id="streaming"`) connecting to `/jds/res?token=...`. The `/jds/req` POST sends RIC codes with FID numbers to subscribe to real-time data. DOM elements with `class="stream"` attributes (`ric`, `fid`, `service`) get auto-updated.

**ARCA:** No real-time streaming needed (card prices update daily, not tick-by-tick). Instead:
- Periodic polling every 60s for price alerts
- SSE (Server-Sent Events) optional for background sync notifications
- Flash animation on data refresh (CSS `@keyframes flash`)

### Data Field Mapping (TRKD FIDs → ARCA)
| TRKD FID | TRKD Field | ARCA Field | Source |
|----------|-----------|------------|--------|
| 6 | Last/Trade Price | `market_price_cents` | Conflated best price |
| 11 | Net Change | `price_change_cents` | Derived (current - previous) |
| 56 | % Change | `price_change_pct` | Derived |
| 16 | High | `high_price_cents` | From providers |
| 18 | Low | `low_price_cents` | From providers |
| 21 | Bid | *(n/a — no bid/ask for cards)* | |
| 22 | Ask | *(n/a)* | |
| 79 | Volume | `listings_count` | Number of active listings |
| 1465 | Open | `previous_price_cents` | Previous day's price |

## UI Component Mapping

### TRKD `uicomp/` Templates → ARCA Components
| TRKD Component | ARCA Component |
|---------------|---------------|
| `markettop` | `<MarketOverview>` — Main dashboard layout |
| `quotemonitor` | `<WatchlistPage>` — Card watchlist |
| `stockfullquote` | `<CardDetailPage>` — Full card detail |
| `stocklv2tmpl` | `<PriceDepth>` — Multi-source price breakdown |
| `quoteboxtmpl` | `<QuoteBox>` — Compact card price widget |
| `fundfullquote` | `<SetDetailPage>` — Full set analysis |
| `funddivcomptmpl` | `<SetComparison>` — Compare sets |
| `prodcomptmpl` | `<CardComparison>` — Compare cards |

### CSS Theme
**TRKD:** `theme-black` class on body, dark terminal aesthetic with:
- Background: Pure black (#000)
- Text: White/grey
- Up values: Bright green
- Down values: Red
- Highlights: Yellow headers
- Borders: Dark grey

**ARCA Diamond Theme:** Already aligned — `#080E1A` background, similar terminal feel. The TRKD scrape validates our Diamond theme direction.

### Data Density Patterns
**TRKD uses ultra-dense layouts:**
- Font size: 12px base (`size-12` class, configurable up to `size-15`)
- No padding waste — every pixel used for data
- Tables with minimal row height
- Color-coded values (no labels needed — position implies meaning)
- Time column at far right of every data row
- Column headers with sort indicators

**ARCA should adopt:**
- Monospace `font-mono` for all numerical data
- `tabular-nums` for aligned columns
- 11-12px base size for data tables
- Color-coded price changes (green/red)
- Compact row heights (24-28px)
- Time/date stamp on every price

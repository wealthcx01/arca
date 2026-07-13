# ARCA Advanced Analytics & Data Infrastructure — Implementation Summary

**Date:** 2026-03-14
**Status:** All 8 phases implemented, 0 typecheck errors

---

## What Was Built

34 new/modified files transforming ARCA from "card tracker with prices" into "Bloomberg Terminal for Pokemon Cards" with institutional-grade analytics.

---

## Phase 1: Schema Expansion & OHLC Generation

**Purpose:** Database foundation — 6 new tables and daily OHLC bar synthesis.

### New Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `card_ohlc_daily` | Daily OHLC bars from price_history | card_id, currency, date (YYYY-MM-DD), open/high/low/close_cents, source_count |
| `technical_indicators` | Pre-computed indicators per card/date | card_id, currency, date, indicator (text), value_e6 |
| `card_analytics` | Composite analytics snapshot per card | card_id, currency, volatility_e6, sharpe_e6, max_drawdown_bp, liquidity_score (0-100), trend_score (-100..+100), vwap_cents, arca_score (0-100), grading_alpha_bp |
| `pop_reports` | PSA/CGC/BGS population data | card_id, grading_company, grade, population, population_higher, total_pop |
| `market_news` | Market news/events | title, summary, source, url, published_at, card_ids (JSON), sentiment |
| `market_index_daily` | ARCA Market Index | date, index_value_e6 (base 1M), total_market_cap_cents, card_count, avg/median price, top10_concentration_bp |

### OHLC Generation (`modules/analytics/ohlc.ts`)

- `generateOHLC(cardId, currency, date)` — Queries price_history for a day, produces O/H/L/C from recorded_at ordering
- `generateOHLCForDate(date)` — Processes all cards for a date; falls back to `card_prices` snapshot if no history
- `backfillOHLC(days)` — Backfills last N days
- `dailyOHLCJob()` — Called by scheduler for yesterday's data

### Files
- `modules/analytics/schema.ts` — All 6 table definitions + type exports
- `modules/analytics/ohlc.ts` — OHLC generation logic
- `db/push.ts` — Updated with CREATE TABLE + indexes for all new tables

---

## Phase 2: Technical Indicators Engine

**Purpose:** Server-side computation of all technical indicators using integer math.

### Indicators (`modules/analytics/indicators.ts`)

All take `OHLCBar[]` (sorted by date asc) and return `IndicatorPoint[]` with `value_e6` (integer x 1M):

| Indicator | Function | Formula |
|-----------|----------|---------|
| SMA | `sma(bars, period)` | Simple moving average of close prices |
| EMA | `ema(bars, period)` | Exponential MA, k = 2/(period+1), SMA seed |
| RSI | `rsi(bars, period=14)` | Relative Strength Index 0-100, smoothed |
| MACD | `macd(bars, 12, 26, 9)` | Returns { macd, signal, histogram } |
| Bollinger | `bollingerBands(bars, 20, 2)` | Returns { upper, middle, lower } |
| ATR | `atr(bars, period=14)` | Average True Range |
| ROC | `roc(bars, period)` | Rate of Change |

### Card Analytics (`modules/analytics/card-analytics.ts`)

| Metric | Method | Scale |
|--------|--------|-------|
| Parkinson Volatility | `sqrt(sum(ln(H/L)^2) / (4n*ln2))` annualized | × 1M |
| Sharpe Ratio | `annualized_return / volatility` (risk-free = 0) | × 1M |
| Max Drawdown | Peak-to-trough % decline | basis points |
| Liquidity Score | Data availability (40%) + spread (30%) + provider count (30%) | 0-100 |
| Trend Score | SMA crossover + RSI + MACD histogram | -100 to +100 |
| VWAP Proxy | Provider-priority-weighted average price | cents |

### ARCA Score (`modules/analytics/arca-score.ts`)

Composite 0-100 rating:
- **Momentum (25%):** ROC + trend score
- **Value (20%):** Position in 52-week range (V-shape: best at 20-40%)
- **Liquidity (15%):** Direct from liquidity score
- **Risk-Adjusted Return (25%):** Normalized Sharpe ratio
- **Scarcity (15%):** Pop report exponential decay (lower pop = higher score)

### Grading Alpha (`modules/analytics/grading-alpha.ts`)

`alpha = (graded_price - raw_price - grading_cost) / raw_price`

Costs: PSA $75, CGC $50, BGS $100 (regular tier). Stored in basis points.

### Files
- `modules/analytics/indicators.ts`
- `modules/analytics/card-analytics.ts`
- `modules/analytics/arca-score.ts`
- `modules/analytics/grading-alpha.ts`
- `modules/analytics/market-index.ts`
- `modules/analytics/portfolio-analytics.ts`
- `modules/analytics/jobs.ts`
- `modules/analytics/index.ts`

---

## Phase 3: Analytics API Endpoints

**Purpose:** REST API for all analytics data, mounted at `/api/analytics`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analytics/:cardId/ohlc` | GET | OHLC data (`?days=30&currency=USD`) |
| `/analytics/:cardId/indicators` | GET | Technical indicators (`?indicators=SMA_20,RSI_14,MACD&days=90`) |
| `/analytics/:cardId/summary` | GET | Card analytics snapshot |
| `/analytics/:cardId/grading-alpha` | GET | Grading ROI by company/grade |
| `/analytics/market-index` | GET | Market index history (`?days=90`) |
| `/analytics/screener` | GET | Multi-factor screener (`?min_arca_score=70&sort=sharpe`) |
| `/analytics/heatmap` | GET | Set momentum heatmap data |
| `/analytics/divergence` | GET | Price source divergence (provider disagreement) |
| `/analytics/refresh` | POST | Trigger manual analytics pipeline |
| `/analytics/backfill` | POST | Backfill OHLC (`{ days: 30 }`) |
| `/analytics/portfolio/:id/risk` | GET | Portfolio-level risk metrics |
| `/news` | GET | List recent news |
| `/news/:cardId` | GET | Card-related news |
| `/news` | POST | Create news entry |

### Files
- `modules/analytics/handlers.ts`
- `modules/news/handlers.ts`
- `server.ts` — Updated: mounted `analyticsRouter` + `newsRouter`, registered `registerAnalyticsJobs()`

---

## Phase 4: Charting Infrastructure (lightweight-charts v5)

**Purpose:** Replace recharts for financial visualizations with TradingView's lightweight-charts.

### Components

| Component | Purpose |
|-----------|---------|
| `LightweightChart.tsx` | React wrapper — createChart(), resize observer, theme-aware, cleanup |
| `CandlestickChart.tsx` | OHLC candlestick with SMA/EMA/BB overlay lines, fetches from API |
| `IndicatorPane.tsx` | Separate pane for RSI (with 70/30 lines) and MACD (histogram + signal) |
| `ChartControls.tsx` | Period (1W-ALL), chart type (OHLC/Line/Area), indicator toggles |
| `VolatilityChart.tsx` | ATR area chart |
| `types.ts` | Shared types, theme mapping (Diamond/Pearl → chart colors) |

### lightweight-charts v5 API
Uses `chart.addSeries(CandlestickSeries, options)` pattern (not v4's `chart.addCandlestickSeries()`).

### Kept recharts for
- Pie charts (set allocation, currency exposure)
- Simple bar charts (population reports, top holdings)
- Non-financial visualizations

### Files
- `client/src/components/charts/` — 6 files

---

## Phase 5: Enhanced Card Detail Page

**Purpose:** Transform CardDetailPage into Bloomberg-style terminal view.

### Layout
1. **Terminal Header Bar** — Card name, set, rarity, current price, VWAP, ARCA Score badge
2. **Main Area (left):** CandlestickChart with RSI/MACD toggle panes, conflated price table
3. **Side Panel (right):** Card image, Technical Summary, Risk Metrics, ARCA Score, Source Attribution, Add to Portfolio
4. **Bottom:** Grading Alpha table + Graded Prices table

### New Components
- `TechnicalSummary.tsx` — RSI gauge bar, MACD signal, trend arrow, SMA status
- `RiskMetrics.tsx` — Vol, Sharpe, drawdown, liquidity as labeled rows
- `GradingAlphaPanel.tsx` — Company x Grade table with color-coded alpha %
- `PopReportChart.tsx` — Population distribution bar chart (recharts)

### Files
- `client/src/pages/CardDetailPage.tsx` — Full rewrite
- `client/src/components/analytics/` — 4 components

---

## Phase 6: Enhanced Analytics Page

**Purpose:** Market analytics dashboard with three tabs.

### Tabs
1. **Market** — ARCA Market Index (lightweight-charts area), Set Momentum Heatmap (CSS grid, color by trend), Price Source Divergence table
2. **Screener** — Sortable card table with ARCA Score badges, Sharpe, Vol, Liquidity, Trend columns. Sort by any metric.
3. **Portfolio** — Portfolio selector, risk metrics (value, vol, Sharpe, drawdown, concentration, diversification), currency exposure pie chart

### New Components
- `SetMomentumHeatmap.tsx` — Color-coded grid (green=up, red=down), links to set pages
- `DivergencePanel.tsx` — Cards where providers disagree most, with spread %
- `DrawdownChart.tsx` — Underwater chart (drawdown from peak)
- `ArcaScoreBadge.tsx` — 0-30 red, 30-60 yellow, 60-80 green, 80-100 gold

### Files
- `client/src/pages/AnalyticsPage.tsx` — Full rewrite
- `client/src/components/analytics/` — 4 components

---

## Phase 7: ETL Pipeline + Data Sources

**Purpose:** Structured ETL framework and new data sources.

### ETL Framework (`modules/etl/pipeline.ts`)
- `runETL(source, options)` — Extract → Transform → Load with retry + exponential backoff
- `runAllETL(sources)` — Sequential pipeline execution
- Configurable: maxRetries, retryDelayMs, rateLimit

### Schedule Configuration (`modules/etl/scheduler.ts`)
| Job | Interval |
|-----|----------|
| pricing:free | 6 hours |
| pricing:byok | 12 hours |
| analytics:daily | 24 hours |
| fx:rates | 4 hours |
| pop:reports | weekly |
| news:fetch | 2 hours |

### Pop Report Source (`modules/etl/sources/psa-pop.ts`)
- `upsertPopReports(entries)` — Manual entry / future scraping interface

### News API (`modules/news/handlers.ts`)
- GET/POST endpoints for market news with sentiment tagging and card association

### Files
- `modules/etl/pipeline.ts`, `modules/etl/scheduler.ts`, `modules/etl/sources/psa-pop.ts`
- `modules/news/handlers.ts`

---

## Phase 8: ARCA Score Polish & Seed Script

### ARCA Score Badge
Color gradient with tooltip: 0-30 red, 30-60 yellow, 60-80 green, 80-100 gold. Three sizes (sm/md/lg), optional label.

### Seed Script (`scripts/seed-analytics.ts`)
Full pipeline runner:
1. Backfill OHLC for last N days (default 30)
2. Generate yesterday's OHLC
3. Run full daily analytics pipeline (indicators → analytics → scores → alpha → index)
4. Backfill market index

```bash
bun run scripts/seed-analytics.ts              # Default 30 days
bun run scripts/seed-analytics.ts --backfill-days=90  # Custom
```

---

## Architecture Diagram

```
price_history ──→ card_ohlc_daily ──→ technical_indicators
                        │                      │
                        └──→ card_analytics ←───┘
                                   │
                           arca_score + grading_alpha
                                   │
                           market_index_daily

API Layer:
  /api/analytics/:cardId/ohlc
  /api/analytics/:cardId/indicators
  /api/analytics/:cardId/summary
  /api/analytics/screener
  /api/analytics/heatmap
  /api/analytics/market-index
  /api/analytics/divergence
  /api/news

Frontend:
  CardDetailPage ← CandlestickChart + IndicatorPane + TechnicalSummary + RiskMetrics + GradingAlphaPanel
  AnalyticsPage  ← MarketIndex + SetMomentumHeatmap + Screener + PortfolioRisk + DivergencePanel
```

---

## Integer Math Conventions

All values follow ARCA's integer-only storage policy:

| Suffix | Scale | Example |
|--------|-------|---------|
| `_cents` | × 100 | $12.50 → 1250 |
| `_e6` | × 1,000,000 | 0.15 → 150,000 |
| `_bp` | × 10,000 | 5.25% → 525 |
| `_1pr` | (1+r) × 1,000,000 | +3% → 1,030,000 |

---

## Verification

- `bunx tsc --noEmit` — **0 errors**
- `bun run db:push` — All 22 tables created
- Server starts cleanly with all 10 modules loaded
- lightweight-charts v5.1.0 installed and working with v5 API

---

## File Inventory

### New Backend (15 files)
```
modules/analytics/
├── schema.ts              # 6 table definitions
├── ohlc.ts                # OHLC generation + backfill
├── indicators.ts          # SMA, EMA, RSI, MACD, BB, ATR, ROC
├── card-analytics.ts      # Volatility, Sharpe, drawdown, liquidity, trend, VWAP
├── arca-score.ts          # Composite 0-100 score
├── grading-alpha.ts       # Grading ROI calculation
├── market-index.ts        # Market-cap-weighted index
├── portfolio-analytics.ts # Portfolio-level risk metrics
├── handlers.ts            # 10 API endpoints
├── jobs.ts                # Daily analytics pipeline + scheduler registration
└── index.ts               # Barrel export

modules/etl/
├── pipeline.ts            # Generic ETL runner with retry
├── scheduler.ts           # Schedule configuration
└── sources/
    └── psa-pop.ts         # Pop report upsert

modules/news/
└── handlers.ts            # News CRUD API
```

### New Frontend (14 files)
```
client/src/components/charts/
├── types.ts               # Shared chart types + theme mapping
├── LightweightChart.tsx   # React wrapper for createChart()
├── CandlestickChart.tsx   # OHLC with indicator overlays
├── ChartControls.tsx      # Period/type/indicator toolbar
├── IndicatorPane.tsx      # RSI + MACD panes
└── VolatilityChart.tsx    # ATR area chart

client/src/components/analytics/
├── ArcaScoreBadge.tsx     # Color-coded score badge
├── TechnicalSummary.tsx   # RSI gauge, MACD signal, trend
├── RiskMetrics.tsx        # Vol, Sharpe, drawdown, liquidity
├── GradingAlphaPanel.tsx  # Grading ROI table
├── PopReportChart.tsx     # Population bar chart
├── SetMomentumHeatmap.tsx # Set trend heatmap grid
├── DivergencePanel.tsx    # Provider disagreement table
└── DrawdownChart.tsx      # Underwater chart
```

### Modified (5 files)
```
server.ts                        # +analyticsRouter, +newsRouter, +registerAnalyticsJobs
db/push.ts                       # +6 CREATE TABLE, +7 indexes
client/src/pages/CardDetailPage.tsx  # Full rewrite
client/src/pages/AnalyticsPage.tsx   # Full rewrite
scripts/seed-analytics.ts           # New seed script
```

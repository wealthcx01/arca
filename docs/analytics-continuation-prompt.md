# ARCA Analytics — Continuation Prompt

Copy-paste this into a new Claude Code session to resume development.

---

## Prompt

```
I'm working on ARCA, the "Bloomberg Terminal for Pokemon Cards" at:
C:\Users\John\OneDrive\THALIA\PILLARS\Purpose\Hedge\ARCA\arca\

We just completed a major analytics implementation (8 phases). Before continuing, read the full implementation summary:
- `docs/analytics-implementation.md` — Complete details of what was built

Then read the project context:
- `CLAUDE.md` — Project conventions and architecture
- `server.ts` — All module mounts and middleware

## Current State (2026-03-14)

### What's Done
- **10 modules:** auth, cards, portfolio, pricing, performance, psa, market, analytics, news, watchlist
- **22 SQLite tables** including 6 new analytics tables (card_ohlc_daily, technical_indicators, card_analytics, pop_reports, market_news, market_index_daily)
- **Conflated pricing:** 6 providers, field-level best-price selection, 221/250 cards priced
- **Analytics engine:** OHLC generation, SMA/EMA/RSI/MACD/BB/ATR/ROC indicators, Parkinson volatility, Sharpe ratio, max drawdown, liquidity score, trend score, VWAP proxy, ARCA Score (0-100 composite), grading alpha
- **Charts:** lightweight-charts v5 (candlestick, line, area) + recharts (pie, bar)
- **UI:** Diamond (dark) / Pearl (light) themes, terminal-style layout
- **CardDetailPage:** Bloomberg-style with OHLC chart, RSI/MACD panes, technical summary, risk metrics, grading alpha, source attribution
- **AnalyticsPage:** Three tabs (Market + Screener + Portfolio), market index, set momentum heatmap, divergence panel
- **ETL framework:** Generic pipeline runner with retry/backoff
- **0 typecheck errors**

### Key Architecture
- Money: INTEGER cents (_cents suffix). NEVER float.
- Ratios/scores: INTEGER × 1M (_e6) or × 10K (_bp)
- IDs: nanoid 12 chars via createId()
- Backend: Hono on Bun, port 3001
- Frontend: React 19 + Vite, port 5173
- DB: SQLite via Drizzle ORM (bun:sqlite)
- lightweight-charts v5 API: chart.addSeries(CandlestickSeries, options)

### Analytics API Endpoints
- GET /api/analytics/:cardId/ohlc?days=30&currency=USD
- GET /api/analytics/:cardId/indicators?indicators=SMA_20,RSI_14,MACD&days=90
- GET /api/analytics/:cardId/summary
- GET /api/analytics/:cardId/grading-alpha
- GET /api/analytics/market-index?days=90
- GET /api/analytics/screener?min_arca_score=70&sort=sharpe
- GET /api/analytics/heatmap
- GET /api/analytics/divergence
- POST /api/analytics/refresh
- POST /api/analytics/backfill
- GET /api/analytics/portfolio/:id/risk

### Key Files
- modules/analytics/schema.ts — 6 table definitions
- modules/analytics/indicators.ts — SMA, EMA, RSI, MACD, BB, ATR, ROC
- modules/analytics/card-analytics.ts — Vol, Sharpe, drawdown, liquidity, trend
- modules/analytics/arca-score.ts — Composite 0-100 score
- modules/analytics/handlers.ts — All API endpoints
- modules/analytics/jobs.ts — Daily pipeline (OHLC → indicators → analytics → scores → alpha → index)
- client/src/components/charts/ — 6 chart components (lightweight-charts v5)
- client/src/components/analytics/ — 8 analytics components
- client/src/pages/CardDetailPage.tsx — Bloomberg-style card detail
- client/src/pages/AnalyticsPage.tsx — Market/Screener/Portfolio tabs

### What Might Need Attention Next
1. **Run seed-analytics.ts** — Backfill OHLC + compute analytics: `bun run scripts/seed-analytics.ts`
2. **Visual QA** — Run `bun run dev` and check all pages in both themes at http://localhost:5173
3. **RSI integration** — CardDetailPage's TechnicalSummary shows trend/MACD but RSI needs a separate API call to indicators endpoint
4. **AddHoldingDialog** — Still passes empty portfolioId="" from CardDetailPage
5. **Pop report data** — Table exists but no automated source (PSA has no public API)
6. **News data** — Manual POST only, future: RSS feeds
7. **Playwright e2e** — No tests for new analytics pages yet
8. **Performance** — Analytics pipeline computes all indicators for all cards; may need batching for large card sets

[TASK: describe what you want to do next]
```

---

## Quick Reference: Running the Project

```bash
# Setup
cd C:\Users\John\OneDrive\THALIA\PILLARS\Purpose\Hedge\ARCA\arca
bun install && cd client && bun install && cd ..

# Database
bun run db:push          # Create/update all 22 tables
bun run db:seed          # Seed cards from Pokemon TCG API
bun run scripts/seed-prices.ts     # Seed price data from TCGdex
bun run scripts/seed-analytics.ts  # Generate OHLC + compute all analytics

# Development
bun run dev              # Backend :3001 + Frontend :5173

# Checks
bunx tsc --noEmit        # Typecheck (should be 0 errors)

# Manual analytics refresh
curl -X POST http://localhost:3001/api/analytics/refresh
curl -X POST http://localhost:3001/api/analytics/backfill -d '{"days":30}'
```

## Module Map

```
modules/
├── analytics/     # OHLC, indicators, scores, API (NEW)
│   ├── schema.ts, ohlc.ts, indicators.ts, card-analytics.ts
│   ├── arca-score.ts, grading-alpha.ts, market-index.ts
│   ├── portfolio-analytics.ts, handlers.ts, jobs.ts, index.ts
├── auth/          # Session-based auth
├── cards/         # Pokemon TCG API sync
├── etl/           # ETL pipeline framework (NEW)
│   ├── pipeline.ts, scheduler.ts, sources/psa-pop.ts
├── market/        # Market overview, sets, movers, alerts, ticker
├── news/          # Market news CRUD (NEW)
├── performance/   # Daily P&L pipeline
├── portfolio/     # Portfolios, transactions, holdings
├── pricing/       # Multi-provider conflation engine
├── psa/           # PSA cert verification
└── watchlist/     # User watchlists

client/src/
├── components/
│   ├── analytics/   # 8 components (NEW)
│   ├── charts/      # 6 lightweight-charts components (NEW)
│   ├── portfolio/   # AddHoldingDialog, etc.
│   ├── pricing/     # SourceBadge
│   ├── terminal/    # DataPanel, DataTable
│   └── ui/          # Toaster, Skeleton
├── hooks/           # usePolling
├── lib/             # api.ts, money.ts
└── pages/           # CardDetailPage (rewritten), AnalyticsPage (rewritten)
```

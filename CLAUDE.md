# ARCA — The Bloomberg Terminal for Pokemon Cards

## Quick Start
```bash
bun install
cd client && bun install && cd ..
bun run db:push     # Create database tables (22 tables)
bun run db:seed     # Seed card database from Pokemon TCG API
bun run scripts/seed-prices.ts      # Seed price data from TCGdex
bun run scripts/seed-analytics.ts   # Generate OHLC + compute analytics
bun run dev         # Start backend (:3001) + frontend (:5173)
```

## Architecture
- **Backend:** Hono API server (Bun runtime), modules under `modules/`
- **Database:** SQLite via Drizzle ORM (bun:sqlite), file at `data/arca.db`, 22 tables
- **Frontend:** React 19 + Vite under `client/`, proxy to backend
- **Auth:** Session-based (bcrypt + cookies), routes at `/api/auth/*`
- **Charts:** lightweight-charts v5 (financial) + recharts (simple bar/pie)

## Module Pattern
Each module has: `schema.ts`, `handlers.ts`, `jobs.ts`, `index.ts`
- cards: Card database + Pokemon TCG API sync
- portfolio: Portfolios, transactions, holdings derivation engine
- pricing: Market data pipeline + FX rates + conflated multi-provider pricing
- performance: Daily performance pipeline with P&L decomposition
- analytics: OHLC generation, technical indicators, ARCA Score, grading alpha, market index
- market: Market overview, sets, movers, alerts, ticker
- news: Market news CRUD
- etl: Generic ETL pipeline framework with retry/backoff
- psa: PSA cert verification with caching
- watchlist: User watchlists
- auth: Session-based authentication

## Critical Conventions
- **Money:** INTEGER cents with `_cents` suffix. NEVER REAL/FLOAT.
- **Ratios/scores:** INTEGER × 1,000,000 with `_e6` suffix. Or × 10,000 `_bp` for basis points.
- **Timestamps:** `integer('col', { mode: 'timestamp_ms' })`, UTC always.
- **IDs:** nanoid 12 chars via `createId()` from `src/lib/nanoid.ts`.
- **Returns:** Stored as `(1+r) * 1_000_000` integer.
- **FX rates:** `rate * 1_000_000` integer.
- **Holdings:** DERIVED from transactions, never edited directly.
- **Auth:** Portfolio routes use `X-User-Id` header injected by auth middleware.
- **Charts:** lightweight-charts v5 API uses `chart.addSeries(CandlestickSeries, options)` pattern.

## Analytics Module
- **Tables:** card_ohlc_daily, technical_indicators, card_analytics, pop_reports, market_news, market_index_daily
- **Indicators:** SMA, EMA, RSI, MACD, Bollinger Bands, ATR, ROC (all integer-scaled _e6)
- **Metrics:** Parkinson volatility, Sharpe ratio, max drawdown, liquidity score, trend score, VWAP
- **ARCA Score:** 0-100 composite (momentum 25%, value 20%, liquidity 15%, risk-adjusted 25%, scarcity 15%)
- **Daily pipeline:** OHLC → indicators → analytics → ARCA scores → grading alpha → market index
- **API:** 10 endpoints at /api/analytics (see docs/analytics-implementation.md)
- **Seed:** `bun run scripts/seed-analytics.ts [--backfill-days=30]`

## External APIs
- Pokemon TCG: `https://api.pokemontcg.io/v2` — Key in `.env`
- PSA: `https://api.psacard.com/publicapi/cert/GetByCertNumber/{cert}` — 100/day
- FX: `https://api.frankfurter.app/latest` — Free, no key

## Ports
- Backend: 3001 (3000 used by Elite Vault)
- Frontend: 5173

## Docs
- `docs/analytics-implementation.md` — Full analytics implementation summary (8 phases)
- `docs/analytics-continuation-prompt.md` — Copy-paste prompt for resuming development

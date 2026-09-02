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

## How work here is done

Two rules, set by Bruntsfield across every venture. They exist because both were learned expensively,
and neither is the kind of thing a test can catch.

### 1. Look at the screen before saying it works

**Any change that touches a screen is not verified until the screen has been rendered in a browser,
at desktop (1440×1000) and phone (393×851) size, and looked at as a picture.** Where there is a
design to compare against, render that too and put them side by side. Record each page's height in
the pull request.

Why this is a rule rather than a habit: on the Foundry Studio, thirty pieces of work shipped with
every automated check green — types, 1,459 unit tests, 250 browser tests — while the founder's main
screen was **9,908 pixels tall against a design of 1,900**, half of it finished work nobody needed to
see, and another screen was printing the same sentence twenty times. The tests asserted that every
section was present, in the right order, with correct data. All of that was true. The screen was
unusable anyway.

A screen can be entirely correct and completely unusable. Only looking finds that.

Take the screenshot, then actually look at it. Height is a cheap signal that a screen shows more than
it was meant to; the picture tells you what the problem is.

### 2. Write for the founder

**Simple, clear, detailed, direct English.** This covers tickets, pull request descriptions, commit
messages, code comments, and every word this venture puts in front of the person who owns it.

The founder reads these. They are not required to be technical. So:

- Short sentences.
- The plain word rather than the clever one.
- Say what happened, then what it means, then what to do. In that order.
- Name the thing instead of gesturing at it.
- Detailed is not the opposite of simple. The founder needs specifics; they need them in words they
  already know.

What this forbids: unexplained jargon, a table where a sentence would do, density that saves the
writer's time at the reader's expense, and burying the answer at the end.

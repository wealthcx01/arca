/**
 * Push schema to database — creates all tables.
 * Run with: bun run db:push
 */
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const dataDir = join(import.meta.dir, "..", "data");
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const DB_PATH = join(dataDir, "arca.db");
const db = new Database(DB_PATH, { create: true });

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

console.log("📦 Pushing schema to database...");

// Cards table
db.exec(`
  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    external_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    set_name TEXT NOT NULL,
    set_code TEXT NOT NULL,
    card_number TEXT NOT NULL,
    rarity TEXT,
    image_url TEXT,
    image_url_hires TEXT,
    supertype TEXT NOT NULL,
    types TEXT,
    hp INTEGER,
    artist TEXT,
    created_at INTEGER NOT NULL
  )
`);

// Portfolios table
db.exec(`
  CREATE TABLE IF NOT EXISTS portfolios (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    base_currency TEXT NOT NULL DEFAULT 'GBP',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  )
`);

// Transactions table
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    portfolio_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,
    currency TEXT NOT NULL,
    trade_date INTEGER NOT NULL,
    shipping_cents INTEGER DEFAULT 0,
    fees_cents INTEGER DEFAULT 0,
    taxes_cents INTEGER DEFAULT 0,
    condition TEXT DEFAULT 'NM',
    is_graded INTEGER DEFAULT 0,
    grading_company TEXT,
    grade TEXT,
    cert_number TEXT,
    notes TEXT,
    source TEXT DEFAULT 'manual',
    created_at INTEGER NOT NULL
  )
`);

// Holdings table
db.exec(`
  CREATE TABLE IF NOT EXISTS holdings (
    id TEXT PRIMARY KEY,
    portfolio_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    avg_cost_cents INTEGER NOT NULL,
    total_cost_basis_cents INTEGER NOT NULL,
    currency TEXT NOT NULL,
    condition TEXT,
    is_graded INTEGER DEFAULT 0,
    grading_company TEXT,
    grade TEXT,
    cert_number TEXT,
    first_bought_at INTEGER,
    updated_at INTEGER NOT NULL
  )
`);

// Cert verifications table
db.exec(`
  CREATE TABLE IF NOT EXISTS cert_verifications (
    id TEXT PRIMARY KEY,
    cert_number TEXT NOT NULL UNIQUE,
    grading_company TEXT NOT NULL,
    card_name TEXT,
    grade TEXT,
    year TEXT,
    brand TEXT,
    variety TEXT,
    population INTEGER,
    status TEXT NOT NULL,
    raw_response TEXT,
    verified_at INTEGER NOT NULL
  )
`);

// Card prices table
db.exec(`
  CREATE TABLE IF NOT EXISTS card_prices (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    source TEXT NOT NULL,
    market_price_cents INTEGER,
    low_price_cents INTEGER,
    mid_price_cents INTEGER,
    high_price_cents INTEGER,
    currency TEXT NOT NULL,
    variant TEXT NOT NULL,
    fetched_at INTEGER NOT NULL
  )
`);

// Price history table
db.exec(`
  CREATE TABLE IF NOT EXISTS price_history (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    source TEXT NOT NULL,
    market_price_cents INTEGER,
    mid_price_cents INTEGER,
    currency TEXT NOT NULL,
    variant TEXT NOT NULL,
    recorded_at INTEGER NOT NULL
  )
`);

// FX rates table
db.exec(`
  CREATE TABLE IF NOT EXISTS fx_rates (
    id TEXT PRIMARY KEY,
    base TEXT NOT NULL,
    quote TEXT NOT NULL,
    rate INTEGER NOT NULL,
    fetched_at INTEGER NOT NULL
  )
`);

// Daily performance table
db.exec(`
  CREATE TABLE IF NOT EXISTS daily_performance (
    id TEXT PRIMARY KEY,
    portfolio_id TEXT NOT NULL,
    date INTEGER NOT NULL,
    mktvalue_bod_cents INTEGER NOT NULL,
    mktvalue_eod_cents INTEGER NOT NULL,
    pnl_cents INTEGER NOT NULL,
    price_pnl_cents INTEGER NOT NULL,
    fx_pnl_cents INTEGER NOT NULL,
    transaction_pnl_cents INTEGER NOT NULL,
    return_1pr INTEGER NOT NULL,
    price_return_1pr INTEGER NOT NULL,
    fx_return_1pr INTEGER NOT NULL,
    position_basis_cents INTEGER NOT NULL,
    holdings_count INTEGER NOT NULL,
    cards_count INTEGER NOT NULL,
    computed_at INTEGER NOT NULL
  )
`);

// Users table (for better-auth compatibility)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

// Sessions table
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

// User API keys table (BYOK encrypted keys)
db.exec(`
  CREATE TABLE IF NOT EXISTS user_api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    encrypted_key TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    daily_usage INTEGER NOT NULL DEFAULT 0,
    last_used_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

// Graded prices table
db.exec(`
  CREATE TABLE IF NOT EXISTS graded_prices (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    source TEXT NOT NULL,
    grading_company TEXT NOT NULL,
    grade TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    currency TEXT NOT NULL,
    sale_type TEXT NOT NULL,
    fetched_at INTEGER NOT NULL
  )
`);

// Price source status table
db.exec(`
  CREATE TABLE IF NOT EXISTS price_source_status (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'idle',
    last_sync_at INTEGER,
    last_error TEXT,
    cards_synced INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  )
`);

// Watchlists table
db.exec(`
  CREATE TABLE IF NOT EXISTS watchlists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

// Watchlist items table
db.exec(`
  CREATE TABLE IF NOT EXISTS watchlist_items (
    id TEXT PRIMARY KEY,
    watchlist_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    added_at INTEGER NOT NULL
  )
`);

// ---------------------------------------------------------------------------
// Analytics tables
// ---------------------------------------------------------------------------

// OHLC daily bars
db.exec(`
  CREATE TABLE IF NOT EXISTS card_ohlc_daily (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    currency TEXT NOT NULL,
    date TEXT NOT NULL,
    open_cents INTEGER NOT NULL,
    high_cents INTEGER NOT NULL,
    low_cents INTEGER NOT NULL,
    close_cents INTEGER NOT NULL,
    source_count INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  )
`);

// Technical indicators
db.exec(`
  CREATE TABLE IF NOT EXISTS technical_indicators (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    currency TEXT NOT NULL,
    date TEXT NOT NULL,
    indicator TEXT NOT NULL,
    value_e6 INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

// Card analytics snapshot
db.exec(`
  CREATE TABLE IF NOT EXISTS card_analytics (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    currency TEXT NOT NULL,
    volatility_e6 INTEGER,
    sharpe_e6 INTEGER,
    max_drawdown_bp INTEGER,
    liquidity_score INTEGER,
    trend_score INTEGER,
    vwap_cents INTEGER,
    arca_score INTEGER,
    grading_alpha_bp INTEGER,
    updated_at INTEGER NOT NULL
  )
`);

// Pop reports
db.exec(`
  CREATE TABLE IF NOT EXISTS pop_reports (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    grading_company TEXT NOT NULL,
    grade TEXT NOT NULL,
    population INTEGER NOT NULL,
    population_higher INTEGER NOT NULL DEFAULT 0,
    total_pop INTEGER NOT NULL DEFAULT 0,
    fetched_at INTEGER NOT NULL
  )
`);

// Market news
db.exec(`
  CREATE TABLE IF NOT EXISTS market_news (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    source TEXT NOT NULL,
    url TEXT,
    published_at INTEGER NOT NULL,
    card_ids TEXT,
    sentiment TEXT NOT NULL DEFAULT 'neutral',
    created_at INTEGER NOT NULL
  )
`);

// Market index daily
db.exec(`
  CREATE TABLE IF NOT EXISTS market_index_daily (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    index_value_e6 INTEGER NOT NULL,
    total_market_cap_cents INTEGER NOT NULL,
    card_count INTEGER NOT NULL,
    avg_price_cents INTEGER NOT NULL,
    median_price_cents INTEGER NOT NULL,
    top10_concentration_bp INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

// Add conflated_rank column to card_prices if not present
try {
  db.exec("ALTER TABLE card_prices ADD COLUMN conflated_rank INTEGER DEFAULT 0");
} catch {
  // Column already exists
}

// Create indexes
db.exec("CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name)");
db.exec("CREATE INDEX IF NOT EXISTS idx_cards_set_code ON cards(set_code)");
db.exec("CREATE INDEX IF NOT EXISTS idx_cards_external_id ON cards(external_id)");
db.exec("CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id)");
db.exec("CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_id ON transactions(portfolio_id)");
db.exec("CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON transactions(card_id)");
db.exec("CREATE INDEX IF NOT EXISTS idx_holdings_portfolio_id ON holdings(portfolio_id)");
db.exec("CREATE INDEX IF NOT EXISTS idx_holdings_card_id ON holdings(card_id)");
db.exec("CREATE INDEX IF NOT EXISTS idx_card_prices_card_id ON card_prices(card_id)");
db.exec("CREATE INDEX IF NOT EXISTS idx_price_history_card_id ON price_history(card_id)");
db.exec("CREATE INDEX IF NOT EXISTS idx_fx_rates_base_quote ON fx_rates(base, quote)");
db.exec(
  "CREATE INDEX IF NOT EXISTS idx_daily_performance_portfolio ON daily_performance(portfolio_id, date)",
);
db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)");
db.exec("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)");
db.exec("CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id)");
db.exec(
  "CREATE INDEX IF NOT EXISTS idx_user_api_keys_provider ON user_api_keys(user_id, provider)",
);
db.exec("CREATE INDEX IF NOT EXISTS idx_graded_prices_card_id ON graded_prices(card_id)");
db.exec(
  "CREATE INDEX IF NOT EXISTS idx_graded_prices_card_grade ON graded_prices(card_id, grading_company, grade)",
);
db.exec(
  "CREATE INDEX IF NOT EXISTS idx_card_prices_conflated ON card_prices(card_id, conflated_rank)",
);

// Watchlist indexes
db.exec("CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id)");
db.exec(
  "CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist_id ON watchlist_items(watchlist_id)",
);
db.exec("CREATE INDEX IF NOT EXISTS idx_watchlist_items_card_id ON watchlist_items(card_id)");

// Analytics indexes
db.exec(
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_ohlc_card_date ON card_ohlc_daily(card_id, currency, date)",
);
db.exec("CREATE INDEX IF NOT EXISTS idx_ohlc_date ON card_ohlc_daily(date)");
db.exec(
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_indicators_card_date ON technical_indicators(card_id, currency, date, indicator)",
);
db.exec(
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_card_analytics_card ON card_analytics(card_id, currency)",
);
db.exec("CREATE INDEX IF NOT EXISTS idx_card_analytics_score ON card_analytics(arca_score)");
db.exec(
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_pop_reports_card_grade ON pop_reports(card_id, grading_company, grade)",
);
db.exec("CREATE INDEX IF NOT EXISTS idx_market_news_published ON market_news(published_at)");

console.log("✅ All tables created successfully");
console.log(`📁 Database: ${DB_PATH}`);

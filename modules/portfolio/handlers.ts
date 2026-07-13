import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db";
import { createId } from "../../src/lib/nanoid";
import { cards } from "../cards/schema";
import { cardPrices } from "../pricing/schema";
import { rebuildHoldings } from "./engine";
import { holdings, portfolios, transactions } from "./schema";

export const portfolioRouter = new Hono();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract user_id from X-User-Id header (auth middleware will replace later). */
function getUserId(c: { req: { header: (name: string) => string | undefined } }): string {
  const userId = c.req.header("X-User-Id");
  if (!userId) throw new Error("Missing X-User-Id header");
  return userId;
}

/** Fetch a portfolio and verify it belongs to the user. Returns null if not found or not owned. */
function getOwnedPortfolio(userId: string, portfolioId: string) {
  const db = getDb();
  const row = db
    .select()
    .from(portfolios)
    .where(
      and(
        eq(portfolios.id, portfolioId),
        eq(portfolios.user_id, userId),
        isNull(portfolios.deleted_at),
      ),
    )
    .get();
  return row ?? null;
}

/** Fetch holdings enriched with card data and latest market pricing. */
function getEnrichedHoldings(portfolioId: string) {
  const db = getDb();

  // Prefer conflated best-price (rank=1), fall back to most recent
  const latestPriceSq = sql<number>`(
    SELECT COALESCE(cp.market_price_cents, cp.mid_price_cents, 0)
    FROM ${cardPrices} cp
    WHERE cp.card_id = ${holdings.card_id}
    ORDER BY cp.conflated_rank DESC, cp.fetched_at DESC
    LIMIT 1
  )`.as("latest_price_cents");

  const rows = db
    .select({
      id: holdings.id,
      portfolio_id: holdings.portfolio_id,
      card_id: holdings.card_id,
      quantity: holdings.quantity,
      avg_cost_cents: holdings.avg_cost_cents,
      total_cost_basis_cents: holdings.total_cost_basis_cents,
      currency: holdings.currency,
      condition: holdings.condition,
      is_graded: holdings.is_graded,
      grading_company: holdings.grading_company,
      grade: holdings.grade,
      cert_number: holdings.cert_number,
      first_bought_at: holdings.first_bought_at,
      updated_at: holdings.updated_at,
      card: {
        name: cards.name,
        set_name: cards.set_name,
        image_url: cards.image_url,
      },
      latest_price_cents: latestPriceSq,
    })
    .from(holdings)
    .leftJoin(cards, eq(holdings.card_id, cards.id))
    .where(eq(holdings.portfolio_id, portfolioId))
    .all();

  return rows.map((row) => {
    const priceCents = row.latest_price_cents ?? 0;
    const mktvalueCents = row.quantity * priceCents;
    const costBasis = row.total_cost_basis_cents;
    const pnlCents = mktvalueCents - costBasis;
    const pnlPct = costBasis > 0 ? (pnlCents / costBasis) * 100 : 0;

    return {
      id: row.id,
      portfolio_id: row.portfolio_id,
      card_id: row.card_id,
      quantity: row.quantity,
      avg_cost_cents: row.avg_cost_cents,
      total_cost_basis_cents: row.total_cost_basis_cents,
      currency: row.currency,
      condition: row.condition,
      is_graded: row.is_graded,
      grading_company: row.grading_company,
      grade: row.grade,
      cert_number: row.cert_number,
      first_bought_at: row.first_bought_at,
      updated_at: row.updated_at,
      card: row.card ?? null,
      mktvalue_cents: mktvalueCents,
      pnl_cents: pnlCents,
      pnl_pct: Math.round(pnlPct * 100) / 100,
    };
  });
}

// ---------------------------------------------------------------------------
// POST / — Create portfolio
// ---------------------------------------------------------------------------

portfolioRouter.post("/", async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json<{
    name: string;
    base_currency?: string;
    description?: string;
  }>();

  if (!body.name?.trim()) {
    return c.json({ error: "name is required" }, 400);
  }

  const db = getDb();
  const now = new Date();
  const id = createId();

  db.insert(portfolios)
    .values({
      id,
      user_id: userId,
      name: body.name.trim(),
      description: body.description?.trim() ?? null,
      base_currency: body.base_currency?.toUpperCase() ?? "GBP",
      created_at: now,
      updated_at: now,
    })
    .run();

  const created = db.select().from(portfolios).where(eq(portfolios.id, id)).get();
  return c.json(created, 201);
});

// ---------------------------------------------------------------------------
// GET / — List user's portfolios (excluding soft-deleted), with summary stats
// ---------------------------------------------------------------------------

portfolioRouter.get("/", (c) => {
  const userId = getUserId(c);
  const db = getDb();

  const rows = db
    .select({
      id: portfolios.id,
      name: portfolios.name,
      description: portfolios.description,
      base_currency: portfolios.base_currency,
      created_at: portfolios.created_at,
      updated_at: portfolios.updated_at,
      holdings_count: sql<number>`(
        SELECT COUNT(*) FROM ${holdings}
        WHERE ${holdings.portfolio_id} = ${portfolios.id}
      )`,
    })
    .from(portfolios)
    .where(and(eq(portfolios.user_id, userId), isNull(portfolios.deleted_at)))
    .orderBy(desc(portfolios.updated_at))
    .all();

  return c.json(rows);
});

// ---------------------------------------------------------------------------
// GET /:id — Portfolio detail with holdings
// ---------------------------------------------------------------------------

portfolioRouter.get("/:id", (c) => {
  const userId = getUserId(c);
  const portfolio = getOwnedPortfolio(userId, c.req.param("id"));
  if (!portfolio) return c.json({ error: "Portfolio not found" }, 404);

  const holdingRows = getEnrichedHoldings(portfolio.id);

  return c.json({ ...portfolio, holdings: holdingRows });
});

// ---------------------------------------------------------------------------
// PUT /:id — Update portfolio metadata
// ---------------------------------------------------------------------------

portfolioRouter.put("/:id", async (c) => {
  const userId = getUserId(c);
  const portfolio = getOwnedPortfolio(userId, c.req.param("id"));
  if (!portfolio) return c.json({ error: "Portfolio not found" }, 404);

  const body = await c.req.json<{
    name?: string;
    description?: string;
    base_currency?: string;
  }>();

  const db = getDb();
  db.update(portfolios)
    .set({
      ...(body.name != null ? { name: body.name.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description?.trim() ?? null } : {}),
      ...(body.base_currency != null ? { base_currency: body.base_currency.toUpperCase() } : {}),
      updated_at: new Date(),
    })
    .where(eq(portfolios.id, portfolio.id))
    .run();

  const updated = db.select().from(portfolios).where(eq(portfolios.id, portfolio.id)).get();
  return c.json(updated);
});

// ---------------------------------------------------------------------------
// DELETE /:id — Soft delete portfolio
// ---------------------------------------------------------------------------

portfolioRouter.delete("/:id", (c) => {
  const userId = getUserId(c);
  const portfolio = getOwnedPortfolio(userId, c.req.param("id"));
  if (!portfolio) return c.json({ error: "Portfolio not found" }, 404);

  const db = getDb();
  db.update(portfolios)
    .set({ deleted_at: new Date() })
    .where(eq(portfolios.id, portfolio.id))
    .run();

  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// POST /:id/transactions — Record BUY or SELL
// ---------------------------------------------------------------------------

portfolioRouter.post("/:id/transactions", async (c) => {
  const userId = getUserId(c);
  const portfolio = getOwnedPortfolio(userId, c.req.param("id"));
  if (!portfolio) return c.json({ error: "Portfolio not found" }, 404);

  const body = await c.req.json<{
    card_id: string;
    type: "BUY" | "SELL";
    quantity: number;
    price_cents: number;
    currency: string;
    trade_date?: number | string; // epoch ms or ISO string
    shipping_cents?: number;
    fees_cents?: number;
    taxes_cents?: number;
    condition?: string;
    is_graded?: boolean;
    grading_company?: string;
    grade?: string;
    cert_number?: string;
    notes?: string;
    source?: string;
  }>();

  // Validate required fields
  if (!body.card_id || !body.type || !body.quantity || body.price_cents == null || !body.currency) {
    return c.json(
      { error: "card_id, type, quantity, price_cents, and currency are required" },
      400,
    );
  }

  if (body.type !== "BUY" && body.type !== "SELL") {
    return c.json({ error: "type must be BUY or SELL" }, 400);
  }

  if (body.quantity <= 0) {
    return c.json({ error: "quantity must be positive" }, 400);
  }

  // For SELL, validate we have enough quantity
  if (body.type === "SELL") {
    const db = getDb();
    const holdingFilters = [
      eq(holdings.portfolio_id, portfolio.id),
      eq(holdings.card_id, body.card_id),
    ];
    if (body.condition != null) holdingFilters.push(eq(holdings.condition, body.condition));
    if (body.grade != null) holdingFilters.push(eq(holdings.grade, body.grade));

    const currentHolding = db
      .select()
      .from(holdings)
      .where(and(...holdingFilters))
      .get();

    const currentQty = currentHolding?.quantity ?? 0;
    if (body.quantity > currentQty) {
      return c.json({ error: `Cannot sell ${body.quantity} — only ${currentQty} held` }, 400);
    }
  }

  const db = getDb();
  const txId = createId();
  const now = new Date();
  const tradeDate = body.trade_date ? new Date(body.trade_date) : now;

  db.insert(transactions)
    .values({
      id: txId,
      portfolio_id: portfolio.id,
      card_id: body.card_id,
      type: body.type,
      quantity: body.quantity,
      price_cents: body.price_cents,
      currency: body.currency.toUpperCase(),
      trade_date: tradeDate,
      shipping_cents: body.shipping_cents ?? 0,
      fees_cents: body.fees_cents ?? 0,
      taxes_cents: body.taxes_cents ?? 0,
      condition: body.condition ?? "NM",
      is_graded: body.is_graded ?? false,
      grading_company: body.grading_company ?? null,
      grade: body.grade ?? null,
      cert_number: body.cert_number ?? null,
      notes: body.notes ?? null,
      source: body.source ?? "manual",
      created_at: now,
    })
    .run();

  // Rebuild holdings for this card+condition+grade combo
  await rebuildHoldings(portfolio.id, body.card_id, body.condition ?? "NM", body.grade ?? null);

  const created = db.select().from(transactions).where(eq(transactions.id, txId)).get();
  return c.json(created, 201);
});

// ---------------------------------------------------------------------------
// GET /:id/transactions — List transactions with optional filters
// ---------------------------------------------------------------------------

portfolioRouter.get("/:id/transactions", (c) => {
  const userId = getUserId(c);
  const portfolio = getOwnedPortfolio(userId, c.req.param("id"));
  if (!portfolio) return c.json({ error: "Portfolio not found" }, 404);

  const db = getDb();
  const filters = [eq(transactions.portfolio_id, portfolio.id)];

  const typeFilter = c.req.query("type");
  if (typeFilter) filters.push(eq(transactions.type, typeFilter));

  const cardFilter = c.req.query("card_id");
  if (cardFilter) filters.push(eq(transactions.card_id, cardFilter));

  const rows = db
    .select()
    .from(transactions)
    .where(and(...filters))
    .orderBy(desc(transactions.trade_date))
    .all();

  return c.json(rows);
});

// ---------------------------------------------------------------------------
// DELETE /:id/transactions/:txId — Delete transaction and rebuild holdings
// ---------------------------------------------------------------------------

portfolioRouter.delete("/:id/transactions/:txId", async (c) => {
  const userId = getUserId(c);
  const portfolio = getOwnedPortfolio(userId, c.req.param("id"));
  if (!portfolio) return c.json({ error: "Portfolio not found" }, 404);

  const db = getDb();
  const txId = c.req.param("txId");

  const tx = db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, txId), eq(transactions.portfolio_id, portfolio.id)))
    .get();

  if (!tx) return c.json({ error: "Transaction not found" }, 404);

  db.delete(transactions).where(eq(transactions.id, txId)).run();

  // Rebuild holdings for the affected card+condition+grade
  await rebuildHoldings(portfolio.id, tx.card_id, tx.condition, tx.grade);

  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// POST /:id/quick-add — Quick add a BUY transaction
// ---------------------------------------------------------------------------

portfolioRouter.post("/:id/quick-add", async (c) => {
  const userId = getUserId(c);
  const portfolio = getOwnedPortfolio(userId, c.req.param("id"));
  if (!portfolio) return c.json({ error: "Portfolio not found" }, 404);

  const body = await c.req.json<{
    card_id: string;
    quantity: number;
    price_cents?: number;
    currency?: string;
    condition?: string;
  }>();

  if (!body.card_id || !body.quantity) {
    return c.json({ error: "card_id and quantity are required" }, 400);
  }

  if (body.quantity <= 0) {
    return c.json({ error: "quantity must be positive" }, 400);
  }

  const db = getDb();
  const txId = createId();
  const now = new Date();
  const condition = body.condition ?? "NM";

  db.insert(transactions)
    .values({
      id: txId,
      portfolio_id: portfolio.id,
      card_id: body.card_id,
      type: "BUY",
      quantity: body.quantity,
      price_cents: body.price_cents ?? 0,
      currency: body.currency?.toUpperCase() ?? "GBP",
      trade_date: now,
      shipping_cents: 0,
      fees_cents: 0,
      taxes_cents: 0,
      condition,
      is_graded: false,
      grading_company: null,
      grade: null,
      cert_number: null,
      notes: "Quick add",
      source: "quick-add",
      created_at: now,
    })
    .run();

  await rebuildHoldings(portfolio.id, body.card_id, condition, null);

  const created = db.select().from(transactions).where(eq(transactions.id, txId)).get();
  return c.json(created, 201);
});

// ---------------------------------------------------------------------------
// GET /:id/holdings — Current holdings list
// ---------------------------------------------------------------------------

portfolioRouter.get("/:id/holdings", (c) => {
  const userId = getUserId(c);
  const portfolio = getOwnedPortfolio(userId, c.req.param("id"));
  if (!portfolio) return c.json({ error: "Portfolio not found" }, 404);

  const rows = getEnrichedHoldings(portfolio.id);

  return c.json(rows);
});

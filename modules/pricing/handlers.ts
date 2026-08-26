import { and, desc, eq, gte } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/index.ts";
import { decrypt, encrypt } from "../../src/lib/crypto.ts";
import { conflate } from "./conflation.ts";
import { getAllProviders } from "./providers/registry.ts";
import type { PriceResult } from "./providers/types.ts";
import {
  cardPrices,
  fxRates,
  gradedPrices,
  priceHistory,
  priceSourceStatus,
  userApiKeys,
} from "./schema.ts";

// Ensure providers are registered
import "./providers/index.ts";

export const pricingRouter = new Hono();

// ---------------------------------------------------------------------------
// GET /fx — Current FX rates
// ---------------------------------------------------------------------------

pricingRouter.get("/fx", (c) => {
  const db = getDb();
  const allRates = db.select().from(fxRates).orderBy(desc(fxRates.fetched_at)).all();

  const latestRates: Record<string, (typeof allRates)[number]> = {};
  for (const rate of allRates) {
    const key = `${rate.base}_${rate.quote}`;
    if (!latestRates[key]) {
      latestRates[key] = rate;
    }
  }

  return c.json({ rates: Object.values(latestRates) });
});

// ---------------------------------------------------------------------------
// GET /sources — Provider status and health
// ---------------------------------------------------------------------------

pricingRouter.get("/sources", (c) => {
  const db = getDb();
  const providers = getAllProviders();

  const statuses = db.select().from(priceSourceStatus).all();
  const statusMap = new Map(statuses.map((s) => [s.provider, s]));

  const result = providers.map((p) => {
    const status = statusMap.get(p.name);
    return {
      name: p.name,
      displayName: p.displayName,
      requiresKey: p.requiresKey,
      status: status?.status ?? "idle",
      last_sync_at: status?.last_sync_at ?? null,
      last_error: status?.last_error ?? null,
      cards_synced: status?.cards_synced ?? 0,
    };
  });

  return c.json({ sources: result });
});

// ---------------------------------------------------------------------------
// ARCA-54: every STATIC path is registered BEFORE the `/:cardId` family below.
//
// Hono matches in registration order. With `/keys` declared after `/:cardId`, a request to
// GET /api/pricing/keys bound `cardId = "keys"`, found no card, and returned
// `{"error":"No prices found for this card"}` with a 404 — on the Settings page, with no card in
// view. The key list never loaded and the toast made no sense, on a page whose entire job is
// handling credentials.
//
// So this is a rule, not a one-off move: anything with a literal first segment goes above the
// dynamic routes. Adding a static GET below them silently reintroduces the same bug, which is why
// the test asserts the ORDERING and not only the behaviour.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// BYOK Key Management — /keys/*
// Requires auth middleware (X-User-Id header)
// ---------------------------------------------------------------------------

function getUserId(c: { req: { header: (name: string) => string | undefined } }): string {
  const userId = c.req.header("X-User-Id");
  if (!userId) throw new Error("Missing X-User-Id header");
  return userId;
}

// GET /keys — List user's API keys (redacted)
pricingRouter.get("/keys", (c) => {
  const userId = getUserId(c);
  const db = getDb();

  const keys = db
    .select({
      id: userApiKeys.id,
      provider: userApiKeys.provider,
      is_active: userApiKeys.is_active,
      daily_usage: userApiKeys.daily_usage,
      last_used_at: userApiKeys.last_used_at,
      created_at: userApiKeys.created_at,
    })
    .from(userApiKeys)
    .where(eq(userApiKeys.user_id, userId))
    .all();

  return c.json({ keys });
});

// POST /keys — Add a new API key
pricingRouter.post("/keys", async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json<{ provider: string; api_key: string }>();

  if (!body.provider || !body.api_key) {
    return c.json({ error: "provider and api_key are required" }, 400);
  }

  const validProviders = getAllProviders()
    .filter((p) => p.requiresKey)
    .map((p) => p.name);

  if (!validProviders.includes(body.provider)) {
    return c.json({ error: `Invalid provider. Valid: ${validProviders.join(", ")}` }, 400);
  }

  const db = getDb();
  const encrypted = await encrypt(body.api_key);
  const now = new Date();

  // Upsert: one key per user+provider
  const existing = db
    .select({ id: userApiKeys.id })
    .from(userApiKeys)
    .where(and(eq(userApiKeys.user_id, userId), eq(userApiKeys.provider, body.provider)))
    .get();

  if (existing) {
    db.update(userApiKeys)
      .set({ encrypted_key: encrypted, is_active: true, updated_at: now })
      .where(eq(userApiKeys.id, existing.id))
      .run();
  } else {
    db.insert(userApiKeys)
      .values({
        user_id: userId,
        provider: body.provider,
        encrypted_key: encrypted,
        is_active: true,
        daily_usage: 0,
        created_at: now,
        updated_at: now,
      })
      .run();
  }

  return c.json({ ok: true, provider: body.provider }, 201);
});

// DELETE /keys/:provider — Remove an API key
pricingRouter.delete("/keys/:provider", (c) => {
  const userId = getUserId(c);
  const provider = c.req.param("provider");
  const db = getDb();

  const existing = db
    .select({ id: userApiKeys.id })
    .from(userApiKeys)
    .where(and(eq(userApiKeys.user_id, userId), eq(userApiKeys.provider, provider)))
    .get();

  if (!existing) return c.json({ error: "Key not found" }, 404);

  db.delete(userApiKeys).where(eq(userApiKeys.id, existing.id)).run();

  return c.json({ ok: true });
});

// PUT /keys/:provider/toggle — Toggle a key active/inactive
pricingRouter.put("/keys/:provider/toggle", (c) => {
  const userId = getUserId(c);
  const provider = c.req.param("provider");
  const db = getDb();

  const existing = db
    .select()
    .from(userApiKeys)
    .where(and(eq(userApiKeys.user_id, userId), eq(userApiKeys.provider, provider)))
    .get();

  if (!existing) return c.json({ error: "Key not found" }, 404);

  db.update(userApiKeys)
    .set({ is_active: !existing.is_active, updated_at: new Date() })
    .where(eq(userApiKeys.id, existing.id))
    .run();

  return c.json({ ok: true, is_active: !existing.is_active });
});

// ---------------------------------------------------------------------------
// GET /:cardId — Latest prices for a card (all sources, all variants)
// ---------------------------------------------------------------------------

pricingRouter.get("/:cardId", (c) => {
  const db = getDb();
  const cardId = c.req.param("cardId");

  const prices = db
    .select()
    .from(cardPrices)
    .where(eq(cardPrices.card_id, cardId))
    .orderBy(desc(cardPrices.fetched_at))
    .all();

  if (prices.length === 0) {
    return c.json({ error: "No prices found for this card" }, 404);
  }

  // Group by source and variant
  const grouped: Record<string, Record<string, (typeof prices)[number]>> = {};

  for (const price of prices) {
    if (!grouped[price.source]) {
      grouped[price.source] = {};
    }
    const sourceGroup = grouped[price.source]!;
    if (!sourceGroup[price.variant]) {
      sourceGroup[price.variant] = price;
    }
  }

  return c.json({ card_id: cardId, prices: grouped });
});

// ---------------------------------------------------------------------------
// GET /:cardId/conflated — Best-price with source attribution
// ---------------------------------------------------------------------------

pricingRouter.get("/:cardId/conflated", (c) => {
  const db = getDb();
  const cardId = c.req.param("cardId");

  const allPrices = db
    .select()
    .from(cardPrices)
    .where(eq(cardPrices.card_id, cardId))
    .orderBy(desc(cardPrices.fetched_at))
    .all();

  if (allPrices.length === 0) {
    return c.json({ error: "No prices found for this card" }, 404);
  }

  // Deduplicate: keep latest per source+variant
  const latest = new Map<string, (typeof allPrices)[number]>();
  for (const p of allPrices) {
    const key = `${p.source}|${p.variant}`;
    if (!latest.has(key)) {
      latest.set(key, p);
    }
  }

  const priceResults: PriceResult[] = Array.from(latest.values()).map((p) => ({
    card_id: p.card_id,
    source: p.source,
    variant: p.variant,
    currency: p.currency,
    market_price_cents: p.market_price_cents,
    low_price_cents: p.low_price_cents,
    mid_price_cents: p.mid_price_cents,
    high_price_cents: p.high_price_cents,
  }));

  const conflated = conflate(priceResults);

  return c.json({
    card_id: cardId,
    conflated,
    source_count: latest.size,
  });
});

// ---------------------------------------------------------------------------
// GET /:cardId/graded — Graded prices for a card
// ---------------------------------------------------------------------------

pricingRouter.get("/:cardId/graded", (c) => {
  const db = getDb();
  const cardId = c.req.param("cardId");

  const prices = db
    .select()
    .from(gradedPrices)
    .where(eq(gradedPrices.card_id, cardId))
    .orderBy(desc(gradedPrices.fetched_at))
    .all();

  // Deduplicate: keep latest per source+company+grade
  const latest = new Map<string, (typeof prices)[number]>();
  for (const p of prices) {
    const key = `${p.source}|${p.grading_company}|${p.grade}`;
    if (!latest.has(key)) {
      latest.set(key, p);
    }
  }

  return c.json({
    card_id: cardId,
    graded_prices: Array.from(latest.values()),
  });
});

// ---------------------------------------------------------------------------
// GET /:cardId/history — Price history for a card
// ---------------------------------------------------------------------------

pricingRouter.get("/:cardId/history", (c) => {
  const db = getDb();
  const cardId = c.req.param("cardId");
  const days = Math.max(1, Math.min(365, Number(c.req.query("days") || "30")));

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const history = db
    .select()
    .from(priceHistory)
    .where(and(eq(priceHistory.card_id, cardId), gte(priceHistory.recorded_at, cutoff)))
    .orderBy(desc(priceHistory.recorded_at))
    .all();

  return c.json({ card_id: cardId, days, history });
});

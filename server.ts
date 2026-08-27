import { existsSync } from "node:fs";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { getCookie } from "hono/cookie";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { getDb } from "./db";
import { getSession } from "./db/auth";
import { analyticsRouter } from "./modules/analytics/handlers";
import { registerAnalyticsJobs } from "./modules/analytics/jobs";
import { auctionsRouter } from "./modules/auctions/handlers";
import { registerAuctionJobs } from "./modules/auctions/jobs";
import { authRouter } from "./modules/auth/handlers";
import { cardsRouter } from "./modules/cards/handlers";
import { registerCardJobs } from "./modules/cards/jobs";
import { marketRouter } from "./modules/market/handlers";
import { newsRouter } from "./modules/news/handlers";
import { performanceRouter } from "./modules/performance/handlers";
import { registerPerformanceJobs } from "./modules/performance/jobs";
import { portfolioRouter } from "./modules/portfolio/handlers";
import { pricingRouter } from "./modules/pricing/handlers";
import { registerPricingJobs } from "./modules/pricing/jobs";
import { psaRouter } from "./modules/psa/handlers";
import { watchlistRouter } from "./modules/watchlist/handlers";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:3001"],
    credentials: true,
  }),
);

// Auth middleware — injects X-User-Id header for portfolio module compatibility
app.use("/api/portfolio/*", async (c, next) => {
  const token =
    getCookie(c, "arca_session") || c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  const user = getSession(token);
  if (!user) return c.json({ error: "Session expired" }, 401);
  c.req.raw.headers.set("X-User-Id", user.id);
  await next();
});

// Auth middleware for pricing key management
app.use("/api/pricing/keys/*", async (c, next) => {
  const token =
    getCookie(c, "arca_session") || c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  const user = getSession(token);
  if (!user) return c.json({ error: "Session expired" }, 401);
  c.req.raw.headers.set("X-User-Id", user.id);
  await next();
});

app.use("/api/performance/*", async (c, next) => {
  const token =
    getCookie(c, "arca_session") || c.req.header("Authorization")?.replace("Bearer ", "");
  if (token) {
    const user = getSession(token);
    if (user) c.req.raw.headers.set("X-User-Id", user.id);
  }
  await next();
});

// Health check
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mount module routers
app.route("/api/auctions", auctionsRouter);
app.route("/api/auth", authRouter);
app.route("/api/cards", cardsRouter);
app.route("/api/portfolio", portfolioRouter);
app.route("/api/pricing", pricingRouter);
app.route("/api/performance", performanceRouter);
app.route("/api/psa", psaRouter);
app.route("/api/market", marketRouter);
app.route("/api/analytics", analyticsRouter);
app.route("/api/news", newsRouter);
app.route("/api/watchlist", watchlistRouter);

// System status
app.get("/api/system/status", (c) => {
  return c.json({
    modules: [
      "auctions",
      "auth",
      "cards",
      "portfolio",
      "pricing",
      "performance",
      "psa",
      "market",
      "analytics",
      "news",
      "watchlist",
    ],
    database: "connected",
    uptime: process.uptime(),
  });
});

// Serve the built client when it exists (the Docker image; dev keeps using Vite on 5173).
// API routes are all under /api/* and are registered above, so they win; anything else falls
// through to static assets and finally to index.html — the SPA router owns those paths.
if (existsSync("./client/dist/index.html")) {
  app.use("*", serveStatic({ root: "./client/dist" }));
  app.get("*", serveStatic({ path: "./client/dist/index.html" }));
  console.log("🖥️  Serving built client from client/dist");
}

const port = Number(process.env.PORT) || 3001;

console.log(`🃏 ARCA server starting on port ${port}`);

// Initialize database connection
getDb();
console.log("📦 Database connected");

// Register scheduled jobs (start manually, not auto-started)
registerCardJobs();
registerPricingJobs();
registerPerformanceJobs();
registerAnalyticsJobs();
registerAuctionJobs();
console.log("📋 Background jobs registered");

export default {
  port,
  fetch: app.fetch,
};

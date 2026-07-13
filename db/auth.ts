/**
 * Simple session-based auth.
 * Implements sign-up, login, logout with hashed passwords.
 * Compatible with better-auth patterns but standalone for now.
 */
import { Database } from "bun:sqlite";
import { join } from "node:path";
import type { Context, Next } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createId } from "../src/lib/nanoid";

const DB_PATH = join(import.meta.dir, "..", "data", "arca.db");

function getAuthDb() {
  return new Database(DB_PATH);
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export async function signUp(email: string, password: string, name?: string): Promise<AuthUser> {
  const db = getAuthDb();
  const existing = db.query("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    throw new Error("Email already registered");
  }

  const passwordHash = await Bun.password.hash(password, { algorithm: "bcrypt" });
  const id = createId();
  const now = Date.now();

  db.query(
    "INSERT INTO users (id, email, name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(id, email, name || null, passwordHash, now, now);

  return { id, email, name: name || null };
}

export async function login(
  email: string,
  password: string,
): Promise<{ user: AuthUser; token: string }> {
  const db = getAuthDb();
  const row = db
    .query("SELECT id, email, name, password_hash FROM users WHERE email = ?")
    .get(email) as {
    id: string;
    email: string;
    name: string | null;
    password_hash: string;
  } | null;

  if (!row) {
    throw new Error("Invalid email or password");
  }

  const valid = await Bun.password.verify(password, row.password_hash);
  if (!valid) {
    throw new Error("Invalid email or password");
  }

  // Create session
  const token = createId() + createId() + createId(); // 36 char token
  const sessionId = createId();
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

  db.query(
    "INSERT INTO sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(sessionId, row.id, token, expiresAt, Date.now());

  return {
    user: { id: row.id, email: row.email, name: row.name },
    token,
  };
}

export async function logout(token: string): Promise<void> {
  const db = getAuthDb();
  db.query("DELETE FROM sessions WHERE token = ?").run(token);
}

export function getSession(token: string): AuthUser | null {
  const db = getAuthDb();
  const row = db
    .query(`
    SELECT u.id, u.email, u.name
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > ?
  `)
    .get(token, Date.now()) as AuthUser | null;

  return row;
}

/** Hono middleware: require authentication */
export async function requireAuth(c: Context, next: Next) {
  const token =
    getCookie(c, "arca_session") || c.req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const user = getSession(token);
  if (!user) {
    return c.json({ error: "Session expired" }, 401);
  }

  c.set("user", user);
  c.set("userId", user.id);
  await next();
}

/** Hono middleware: optional authentication (sets user if present) */
export async function optionalAuth(c: Context, next: Next) {
  const token =
    getCookie(c, "arca_session") || c.req.header("Authorization")?.replace("Bearer ", "");

  if (token) {
    const user = getSession(token);
    if (user) {
      c.set("user", user);
      c.set("userId", user.id);
    }
  }

  await next();
}

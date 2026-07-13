import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { getSession, login, logout, signUp } from "../../db/auth";

export const authRouter = new Hono();

/** POST /api/auth/signup */
authRouter.post("/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    if (password.length < 8) {
      return c.json({ error: "Password must be at least 8 characters" }, 400);
    }

    const user = await signUp(email, password, name);
    const { token } = await login(email, password);

    setCookie(c, "arca_session", token, {
      httpOnly: true,
      secure: false, // Set to true in production
      sameSite: "Lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return c.json({ user, token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signup failed";
    return c.json({ error: message }, 400);
  }
});

/** POST /api/auth/login */
authRouter.post("/login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const { user, token } = await login(email, password);

    setCookie(c, "arca_session", token, {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return c.json({ user, token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return c.json({ error: message }, 401);
  }
});

/** POST /api/auth/logout */
authRouter.post("/logout", async (c) => {
  const token =
    getCookie(c, "arca_session") || c.req.header("Authorization")?.replace("Bearer ", "");

  if (token) {
    await logout(token);
  }

  deleteCookie(c, "arca_session", { path: "/" });
  return c.json({ ok: true });
});

/** GET /api/auth/me */
authRouter.get("/me", (c) => {
  const token =
    getCookie(c, "arca_session") || c.req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return c.json({ user: null });
  }

  const user = getSession(token);
  return c.json({ user });
});

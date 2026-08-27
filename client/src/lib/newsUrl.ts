/**
 * Mirrors `modules/news/url-safety.ts` on the server. That file rejects any news `url` that isn't
 * `http(s):` at write time (ARCA-73), but rows written before that check existed can still carry a
 * `javascript:`/`data:` scheme — so the render path re-checks independently rather than trusting the
 * write path never let one through.
 */

const ALLOWED = new Set(["http:", "https:"]);

/** The URL to render as a link, or null when it must not become one. */
export function safeLinkHref(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return ALLOWED.has(url.protocol) ? trimmed : null;
  } catch {
    return null;
  }
}

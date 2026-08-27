/**
 * Is this a URL we are willing to store and, later, render as a link? (ARCA-73)
 *
 * A news item carries a `url` that a reader is meant to be able to click. Anything that can be put
 * in an `href` and is not `http(s):` is a way to run something in the reader's session —
 * `javascript:` most obviously, `data:` and `vbscript:` for the same reason. So this is an allowlist
 * of two schemes rather than a blocklist of the ones we thought of.
 *
 * It lives on its own because it is needed in two places that must not disagree: the write path
 * rejects a bad URL, and the render path must still refuse to linkify one that got in before this
 * existed. A single rule with one home is the only version of that which stays true.
 */

/** The only two schemes a news link may use. */
const ALLOWED = new Set(["http:", "https:"]);

/**
 * True when `raw` is a URL safe to store and to put in an `href`.
 *
 * Parsing rather than pattern-matching: `URL` resolves the escapes, the whitespace and the case
 * folding that a regex on the raw string gets wrong. `java\nscript:alert(1)` and
 * `JaVaScRiPt:alert(1)` are the same attack and neither survives a parse.
 *
 * A relative URL has no scheme and cannot be parsed without a base, so it is refused too: a news
 * item points somewhere outside this application by definition, and accepting `/anything` here would
 * be accepting something that is not a news link.
 */
export function isSafeHttpUrl(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (!trimmed) return false;
  try {
    return ALLOWED.has(new URL(trimmed).protocol);
  } catch {
    return false;
  }
}

/**
 * The URL to render, or null when it must not become a link.
 *
 * For the render side to use rather than calling `isSafeHttpUrl` and then forgetting the else. Rows
 * written before ARCA-73 were stored under no rules at all, so a reader may still meet one.
 */
export function safeLinkHref(raw: unknown): string | null {
  return isSafeHttpUrl(raw) ? (raw as string).trim() : null;
}

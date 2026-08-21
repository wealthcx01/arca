/**
 * Chrome DevTools Protocol shapes, as far as these scripts actually use them (ARCA-65).
 *
 * The capture and verify scripts talk to Chrome over CDP, whose responses are dynamic JSON-RPC.
 * That is a real reason for `any` and not a good one: every one of these scripts read specific
 * fields off those responses, so the shape was known — it was simply never written down, and the
 * compiler could not catch a typo in a field name that only fails at runtime, in a script nobody
 * runs on a schedule.
 *
 * Deliberately partial. These describe what is read, not the whole protocol; anything genuinely
 * unknown stays `unknown` and gets narrowed at the point of use, which is the honest version of
 * `any`.
 */

/** A CDP method's parameters. Values are whatever the protocol takes — narrow at the call site. */
export type CdpParams = Record<string, unknown>;

/** What `/json/list` returns per debuggable target. */
export interface CdpTarget {
  id?: string;
  type?: string;
  title?: string;
  url?: string;
  webSocketDebuggerUrl?: string;
}

/** `Runtime.evaluate` — the half these scripts read. */
export interface CdpEvaluateResult {
  result?: { type?: string; value?: unknown; description?: string };
  exceptionDetails?: { text?: string; exception?: { description?: string } };
}

/** `Page.captureScreenshot`. */
export interface CdpScreenshotResult {
  data?: string;
}

/** A minimal page handle: send a CDP method, get its result back. */
export interface CdpPage {
  send: (method: string, params?: CdpParams) => Promise<unknown>;
}

/**
 * The message text of a thrown value, without asserting it is an Error.
 *
 * `catch (e: any)` then `e.message` is the pattern this replaces. A thrown value is genuinely
 * `unknown` — code throws strings, and rejected promises carry anything — so ask rather than assert.
 */
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return typeof e === "string" ? e : String(e);
}

/**
 * What the LSEG capture script's injected page script returns (ARCA-65).
 *
 * The expression is written in this repository — `capture-lseg-all.ts` builds the very JS that
 * produces this object — so its shape was never unknown. Writing it down is the point: a rename in
 * the injected script and a stale read here now disagree at compile time rather than printing
 * `undefined` into a report nobody re-reads.
 */
export interface LsegNavItem {
  text?: string;
}

export interface LsegHeading {
  tag?: string;
  text?: string;
}

export interface LsegAnalysis {
  target?: string;
  title?: string;
  url?: string;
  dir?: string;
  error?: string;
  navItems?: LsegNavItem[];
  headings?: LsegHeading[];
  uniqueColors?: string[];
  cssVars?: Record<string, string>;
  uiPatterns?: {
    hasSearchBar?: boolean;
    hasTabs?: boolean;
    hasCards?: boolean;
    hasCharts?: boolean;
    hasSidebar?: boolean;
    hasToolbar?: boolean;
  };
  tables?: { tag?: string; class?: string; rows?: number; cols?: number }[];
  viewport?: { w?: number; h?: number };
  colors?: { background?: string; color?: string; fontFamily?: string; fontSize?: string };
}

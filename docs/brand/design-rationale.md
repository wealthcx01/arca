# ARCA Brand & Visual Identity — Design Rationale

Ticket: ARCA-62. Founder direction (`arca-brand-positioning`): premium is *earned*
through data — the ARCA Score, grading alpha, and market coverage no one else has —
not applied as decoration. Every choice below is justified against one of those three
signals, or explicitly named as pure legibility/mechanics with no data claim attached.

## The rule the palette enforces

**Gold is a signal, not a decoration.** Across both themes, the accent color
(`--color-primary`, chart-1) appears in exactly three kinds of places:

1. Primary actions the user is about to take (buy, save, confirm)
2. The ARCA Score badge's top tier (`>= 80`, "Strong") — `ArcaScoreBadge.tsx`
3. Graded-holding tags in the portfolio table — `HoldingsTable.tsx`

It does not appear as a background wash, a decorative border, or a hover-state
flourish anywhere else. If gold shows up, it means ARCA has proven something about
that row of data. Everything else — including the rest of the ARCA Score gradient,
which steps through negative → warning → positive before it ever reaches gold — uses
neutral or semantic color, so the one accent that exists reads as earned rather than
sprinkled in for polish.

## Palette: "near-black terminal ground, bullion-gold signal"

Previous palette: `#b04a82` (Pearl) / `#4a8fe7` (Diamond) — a rose-pink and a
corporate blue, neither tied to anything ARCA does. Replaced with:

- **Diamond (dark, default):** `#0a0a0a` background, `#eae6da` warm-parchment text,
  `#c9a860` antique-gold signal. Near-black rather than navy — Bloomberg/LSEG-Eikon
  register, and it reads as a serious instrument, not a consumer dashboard.
- **Pearl (light):** `#f7f4ec` warm parchment/certificate-stock background,
  `#1a1712` near-black text, `#7a5b1e` deepened gold (darkened from the Diamond gold
  to clear WCAG AA contrast on a light ground — verified ~4.6:1+ on all primary/text
  pairs used for UI text).

Both themes deliberately avoid corporate blue and avoid decorative gradients — flat
fills only, matching the 2025-26 premium-fintech/trading-terminal direction cited in
`market-note-terminal-wedge`: high-contrast, restrained, black-or-gold-leaning, not
generic SaaS blue.

Chart-2/3 ("secondary" categorical colors) are a muted steel-blue and a bronze rather
than saturated defaults, so multi-series charts (currency exposure pie, indicator
overlays) stay inside the same restrained family instead of reverting to a rainbow
the moment there's more than one series.

CSS variable *names* are unchanged (`--color-background`, `--color-primary`,
`--color-chart-1..5`, etc.) so every existing `var(--color-*)` reference across the
app repainted automatically. Three names were added — `--color-positive-foreground`,
`--color-negative-foreground`, `--color-warning-foreground` — because the old palette
hardcoded `text-white` on top of semantic backgrounds; the new gold/positive/warning
tones are light enough in Diamond that white text on them fails contrast, so each
semantic color now carries an explicit readable foreground the way `--color-primary`
already did.

## Typography: a mechanical fix, promoted into the identity

`font-family: "Geist", "Inter", ...` was declared in `index.css` but never loaded —
no `@font-face`, no font files, no CDN link — so the entire app silently rendered in
`system-ui`. That's a bug fix, not a brand claim, and it's called out as such:

- **`--font-sans` (Inter Variable):** UI text and labels. High-legibility workhorse,
  self-hosted via `@fontsource-variable/inter` so it loads reliably with no
  network dependency at runtime.
- **`--font-display` (Space Grotesk):** headings and the wordmark. Distinctive
  geometric character gives ARCA a typographic identity separate from "default app
  font," without tipping into a decorative display face.
- **`--font-mono` (IBM Plex Mono):** reserved for tabular/price data — the terminal's
  data cells, quote boxes, price tickers. Monospace numerals align decimal points and
  make price columns scannable at a glance. This one *is* a data-credibility choice:
  it's the typographic equivalent of a real terminal's fixed-width price feed, used
  only where real numbers are being displayed, not decoratively elsewhere.

All three are self-hosted npm packages (`@fontsource*`), not a CDN link, so there's
no missing-font fallback risk and no third-party request in the critical path.

## Logo

New mark (`client/src/components/ui/Logo.tsx`, static favicon at
`client/public/favicon.svg`): a rounded-square "slab" frame — the same silhouette as
a graded-card holder — around three ascending bars and a single trendline that dips
then breaks upward into a small point. The dip-then-break-upward line is a literal
depiction of *alpha*: performance that underperforms, then outperforms once the
market catches up to what the data already showed. That is what ARCA's grading-alpha
and ARCA Score analytics are built to find, so the mark encodes the product's actual
claim rather than an abstract "A" or a generic chart icon. Rendered in `currentColor`
so it repaints with the theme; only the static favicon (which can't read CSS
variables) hardcodes the Diamond gold-on-black version, since that's the app's
default theme.

## Component layer

`DataPanel` and `DataTable` (`components/terminal/`) already served as the
panel/card and table shells and were already token-driven — they needed no
structural change, only the header-color contrast fix described above. Two
primitives genuinely didn't exist and were added to `components/ui/`:

- **`Button`** (`class-variance-authority`, already a dependency but previously
  unused) — `primary` / `outline` / `ghost` / `destructive` variants so future CTAs
  don't hand-roll the button className again.
- **`Badge`** — `neutral` / `primary` / `positive` / `negative` / `warning`
  variants, same gold-means-earned rule as everywhere else.

This is intentionally thin. The ticket scope is a restyle, not a design-system
rebuild, so no wrapper was added where an existing token-driven component already
did the job.

## What "restrained" ruled out

Per-source color-coding on pricing badges (`SourceBadge.tsx`) — eight arbitrary
Tailwind hues, one per data provider — was replaced with a single neutral tag; the
source name in the label already carries that information, and eight decorative
hues fighting a two-color palette is exactly the "applied, not earned" polish the
brand direction rejects. Grading badges in the portfolio table, by contrast, do get
the gold treatment (see the "gold is a signal" rule above) — because grading is a
proven signal, and provider identity isn't.

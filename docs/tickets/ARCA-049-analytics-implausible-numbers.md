# ARCA-49 — Analytics "Market" tab shows implausible, unlabeled numbers that contradict the rest of the app

**Status:** Planned · **Area:** Analytics/Content · **Depends on:** ARCA-12, ARCA-21

## Context
Filed from the ARCA-43 UI/UX audit, under "are numbers labelled well enough to be trusted?"

## What I did
Signed up fresh, visited `/analytics` (Market tab, the default).

## What happened
The "ARCA Market Index" summary shows:
```
INDEX VALUE     0.02
MARKET CAP      US$9.45
CARDS TRACKED   1
DATA POINTS     35 days
```
next to a line chart that plots values from roughly 0.5 to 2.0. Elsewhere in the same app, for the
same account, at the same moment: Overview's Market Stats panel reports "Total Cards: 502" and
"Priced Cards: 439," and the card catalog / graded market / screener all show dozens of priced cards
with real, sane-looking prices ($5–$800+). A market index built from "Cards Tracked: 1" with a
"Market Cap" of $9.45 reads as broken, not as a legitimate market-wide index — there's no tooltip,
footnote, or methodology link explaining why the index only tracks one card while the rest of the app
tracks hundreds. The "Set Momentum Heatmap" and "Price Source Divergence" panels below it both say "No
[...] data available" with no further explanation either.

## What I expected
Either the market index to reflect the same card universe as the rest of the app (or explain, e.g.
via a tooltip or subtitle, why it's scoped differently — such as "index seeded from N cards with full
OHLC history"), or an honest empty/low-confidence state instead of a single-card index presented with
the same visual weight as a real headline metric.

## Repro steps
1. Sign in, visit `/analytics` (default "Market" tab).
2. Compare "Cards Tracked: 1" / "Market Cap: US$9.45" against Overview's "Total Cards: 502" /
   "Priced Cards: 439" for the same account.

## Acceptance criteria
- [ ] The market index's scope (how many cards / what data it's built from) is either consistent with
      the rest of the app or explicitly labelled so a viewer can judge how much to trust it.

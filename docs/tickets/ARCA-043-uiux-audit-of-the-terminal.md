# ARCA-43 — Audit the terminal's interface and file what is broken or missing

**Status:** Todo · **Area:** Frontend/UX · **Gate:** pr · **Depends on:** —

## Context
Nobody has looked at ARCA the way a new user meets it: sign up, land, and try to get somewhere. The
tests cover the maths and the holdings engine. They do not cover whether the product is
comprehensible, whether every page renders, or what a person sees on their first visit before any
data exists.

This ticket is the audit itself. Work it on the box, drive the running app, and file what you find.

## Scope

**Get it running and use it as a new user would.** Follow the README from a clean state — note
anything in that path that does not work, because that is a finding too. Create a fresh account. Do
not seed yourself special data; the empty state is the state every new user starts in and it is part
of what is being audited.

**Walk every route.** There are twelve in the nav — Overview, Sets & Eras, News, Cards, Graded,
Watchlist, Screener, Portfolio, Trades, Analytics, Import, Settings — plus card detail and login. On
each one, record:
- Does it render at all? A blank page or an unhandled error is the most serious class of finding.
- What does it say when there is no data? Distinguish an *empty state that explains itself* from a
  panel that is simply blank.
- Does anything claim to be loading, saving or working, and never finish?
- Console errors and failed network requests.

**Look at it at three widths** — 1024, 1280 and 375. Note anything clipped, unreachable, or
overlapping. A laptop width is the one most people use; do not only check the extremes.

**Read the words.** Is the copy something a collector would recognise, or is it internal shorthand?
Is any of it borrowed from another company's product? Are numbers labelled well enough to be
trusted?

**Judge the first five minutes.** From a standing start, is there an obvious next action? If a new
user would not know what to do, that is the most valuable finding on the list.

## How to file what you find
One ticket per finding, in `docs/tickets/`, each taking the next free id after the highest already in
the directory — do not reuse a fixed starting number. Each one states what you
did, what happened, what you expected, and how to reproduce it. Order the set by what would most
damage a first impression.

**Do not fix anything in this ticket.** The audit is the deliverable; the fixes are the tickets it
produces, worked separately so each is reviewable on its own.

Anything you could not establish — a page you could not reach, a state you could not reproduce — say
so explicitly rather than leaving it out.

## Acceptance criteria
- [ ] Every route in the nav has been visited on a real running instance and its state recorded.
- [ ] Every page that fails to render, or shows a state that never resolves, has its own ticket.
- [ ] Findings at 1024 / 1280 / 375 are recorded, or their absence stated.
- [ ] A judgement on the first five minutes, with the specific thing a new user should be offered.
- [ ] No fixes in this PR — only the audit and the tickets it produced.

# ARCA-67 — The Pokémon TCG API key is hardcoded in source

**Status:** Blocked · **Area:** Infra/Security · **Depends on:** ARCA-31 · **Blocked on:** John

**Parked 2026-08-27, and not by the lane's own gate.** Moving the key to an environment variable is
half a fix and the less important half: the key is in git history, so it stays readable from an
earlier commit whatever the current file says. Until a **new key is issued at pokemontcg.io and the
exposed one revoked**, doing the code half would leave the repository looking fixed while the
credential in it still works — which is worse than leaving it visibly open.

So this waits on one action only a person with the Pokémon TCG account can take. It is set to
`Blocked` rather than left `Todo` so the lane stops offering it as a decision the founder can make
with a click; it is not a decision, it is an errand.

**To unblock:** issue a new key, revoke `2248c117-…`, put the new one on the box, and set this back
to `Todo`. The code change then takes minutes.

## Why this matters
A credential in source is a credential in every clone, every fork, and every laptop that has ever
checked this repository out. It is also in the git history, so removing the line does not remove the
key — anyone with the repo can read it from an earlier commit.

The blast radius here is genuinely small: it is a **free, read-only Pokémon TCG API key** whose worst
outcome is someone else consuming the rate limit. That is why this is a Todo and not an incident.
It is worth fixing anyway, because the habit is the problem: the next credential to be committed
this way will not be a free one.

## Where it is

```
db/seed.ts:15          const API_KEY = "2248c117-…"
modules/cards/jobs.ts:6 const API_KEY = "2248c117-…"
.env.example:6         POKEMON_TCG_API_KEY=2248c117-…
```

`.env.example` is the one that makes this awkward. Its whole job is to be committed, and it currently
ships a **real** key as the example value — so the documented setup path (`cp .env.example .env`)
hands every new developer a working credential and no reason to get their own.

## Scope
- Read the key from `POKEMON_TCG_API_KEY` in both `db/seed.ts` and `modules/cards/jobs.ts`, with no
  literal fallback. Fail loudly and by name when it is absent — the seeder already knows how to do
  this since ARCA-44, and a seed that silently fetches nothing is the failure that ticket fixed.
- Put a **placeholder** in `.env.example`, not a key. The README already tells a new developer to set
  it (ARCA-52); the example file should make it obvious that it must be replaced.
- Rotate the key. It has been public in this repository's history and cannot be un-published; a
  fix that leaves the exposed key valid has changed nothing an attacker cares about.

## Explicitly NOT here
- **Rewriting git history.** The key is in one commit. Rewriting a shared history to remove it is
  disruptive, and rotation makes it moot — a revoked key in an old commit is a string, not a secret.
- Auditing other credentials. `ARCA_ENCRYPTION_KEY` and `BETTER_AUTH_SECRET` are already placeholders
  in `.env.example`; this ticket is about the one that is not.

## Acceptance criteria
- [ ] Neither `db/seed.ts` nor `modules/cards/jobs.ts` contains a literal key.
- [ ] Both fail with a named, actionable message when `POKEMON_TCG_API_KEY` is unset, rather than
      fetching nothing and reporting success.
- [ ] `.env.example` carries a placeholder that cannot be mistaken for a working value.
- [ ] The old key is rotated, and the new one exists only in a real `.env` and the deployment env.

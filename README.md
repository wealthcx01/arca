# ARCA — The Bloomberg Terminal for Pokemon Cards

## Quick Start

1. Copy the environment template and fill in real values:

   ```bash
   cp .env.example .env
   ```

   Set `POKEMON_TCG_API_KEY` (required for card seeding), and give `BETTER_AUTH_SECRET` and
   `ARCA_ENCRYPTION_KEY` real values (not the placeholder text) before seeding or running the app.

2. Install dependencies and set up the database:

   ```bash
   bun install
   cd client && bun install && cd ..
   bun run db:push
   bun run db:seed
   bun run scripts/seed-prices.ts
   bun run scripts/seed-analytics.ts
   ```

   `seed-analytics.ts` takes several minutes. It may print an error at the very end of an
   otherwise successful run in its summary step (known issue, ARCA-56) — that error alone doesn't
   mean setup failed.

3. Start the app:

   ```bash
   bun run dev
   ```

   This starts the backend at http://localhost:3001 and the frontend at http://localhost:5173.

## More details

See `CLAUDE.md` for architecture, module layout, and other project conventions.

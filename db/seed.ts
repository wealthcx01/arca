/**
 * Seed card database from Pokemon TCG API.
 * Run with: bun run db:seed
 */
import { Database } from "bun:sqlite";
import { join } from "node:path";
import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const createId = customAlphabet(alphabet, 12);

const DB_PATH = join(import.meta.dir, "..", "data", "arca.db");
const db = new Database(DB_PATH);

const API_KEY = "2248c117-dc9f-4479-8db7-3336e515db9c";
const BASE_URL = "https://api.pokemontcg.io/v2";

interface PokemonCard {
  id: string;
  name: string;
  supertype: string;
  types?: string[];
  hp?: string;
  number: string;
  artist?: string;
  rarity?: string;
  set: {
    id: string;
    name: string;
  };
  images: {
    small: string;
    large: string;
  };
}

interface ApiResponse {
  data: PokemonCard[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

const upsertStmt = db.prepare(`
  INSERT INTO cards (id, external_id, name, set_name, set_code, card_number, rarity, image_url, image_url_hires, supertype, types, hp, artist, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(external_id) DO UPDATE SET
    name = excluded.name,
    set_name = excluded.set_name,
    rarity = excluded.rarity,
    image_url = excluded.image_url,
    image_url_hires = excluded.image_url_hires,
    types = excluded.types,
    hp = excluded.hp,
    artist = excluded.artist
`);

async function fetchPage(page: number): Promise<ApiResponse> {
  const url = `${BASE_URL}/cards?page=${page}&pageSize=250`;
  const res = await fetch(url, {
    headers: { "X-Api-Key": API_KEY },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<ApiResponse>;
}

async function seed() {
  console.log("🌱 Seeding card database from Pokemon TCG API...");

  let totalCards = 0;
  let fetchError: unknown = null;
  const maxPages = 5; // Limit to ~1250 cards for initial seed

  for (let page = 1; page <= maxPages; page++) {
    try {
      console.log(`📥 Fetching page ${page}/${maxPages}...`);
      const response = await fetchPage(page);

      if (response.data.length === 0) break;

      for (const card of response.data) {
        upsertStmt.run(
          createId(),
          card.id,
          card.name,
          card.set.name,
          card.set.id,
          card.number,
          card.rarity || null,
          card.images.small,
          card.images.large,
          card.supertype,
          card.types ? JSON.stringify(card.types) : null,
          card.hp ? Number.parseInt(card.hp, 10) : null,
          card.artist || null,
          Date.now(),
        );
        totalCards++;
      }

      console.log(`   ✅ ${response.data.length} cards (${totalCards} total)`);

      // Respect rate limits
      if (page < maxPages) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch (err) {
      console.error(`   ❌ Page ${page} failed:`, err instanceof Error ? err.message : err);
      fetchError = err;
      break;
    }
  }

  if (totalCards === 0) {
    console.error("\n❌ Seed failed: 0 cards were inserted into the database.");
    if (fetchError) {
      console.error(
        `   Cause: request to the Pokemon TCG API failed — ${fetchError instanceof Error ? fetchError.message : fetchError}`,
      );
    } else {
      console.error("   Cause: the Pokemon TCG API returned an empty result set on page 1.");
    }
    console.error(
      "   Check: your network connection, the API_KEY in db/seed.ts, and https://api.pokemontcg.io status.",
    );
    process.exit(1);
  }

  console.log(`\n🎉 Seeded ${totalCards} cards into database`);

  // Show stats
  const cardCount = db.query("SELECT COUNT(*) as count FROM cards").get() as { count: number };
  const setCount = db.query("SELECT COUNT(DISTINCT set_code) as count FROM cards").get() as {
    count: number;
  };
  console.log(`📊 Database: ${cardCount.count} cards across ${setCount.count} sets`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

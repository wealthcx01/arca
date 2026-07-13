import { getDb } from "../../db/index.ts";
import { scheduler } from "../../src/lib/scheduler.ts";
import { cards } from "./schema.ts";

const API_BASE = "https://api.pokemontcg.io/v2/cards";
const API_KEY = "2248c117-dc9f-4479-8db7-3336e515db9c";
const PAGE_SIZE = 100;
const MAX_PAGES = 5; // Seed: 500 cards to avoid rate limits

interface PokemonTcgCard {
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

interface PokemonTcgResponse {
  data: PokemonTcgCard[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

async function fetchPage(page: number): Promise<PokemonTcgResponse> {
  const url = `${API_BASE}?page=${page}&pageSize=${PAGE_SIZE}`;

  const response = await fetch(url, {
    headers: {
      "X-Api-Key": API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Pokemon TCG API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<PokemonTcgResponse>;
}

export async function syncCards(): Promise<void> {
  const db = getDb();

  console.log("[cards:sync] Starting card sync...");

  let totalSynced = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await fetchPage(page);

    if (response.data.length === 0) {
      console.log("[cards:sync] No more cards to fetch.");
      break;
    }

    for (const apiCard of response.data) {
      db.insert(cards)
        .values({
          external_id: apiCard.id,
          name: apiCard.name,
          set_name: apiCard.set.name,
          set_code: apiCard.set.id,
          card_number: apiCard.number,
          rarity: apiCard.rarity ?? null,
          image_url: apiCard.images.small,
          image_url_hires: apiCard.images.large,
          supertype: apiCard.supertype,
          types: apiCard.types ? JSON.stringify(apiCard.types) : null,
          hp: apiCard.hp ? Number.parseInt(apiCard.hp, 10) : null,
          artist: apiCard.artist ?? null,
        })
        .onConflictDoUpdate({
          target: cards.external_id,
          set: {
            name: apiCard.name,
            set_name: apiCard.set.name,
            set_code: apiCard.set.id,
            card_number: apiCard.number,
            rarity: apiCard.rarity ?? null,
            image_url: apiCard.images.small,
            image_url_hires: apiCard.images.large,
            supertype: apiCard.supertype,
            types: apiCard.types ? JSON.stringify(apiCard.types) : null,
            hp: apiCard.hp ? Number.parseInt(apiCard.hp, 10) : null,
            artist: apiCard.artist ?? null,
          },
        })
        .run();

      totalSynced++;
    }

    console.log(`Syncing page ${page}... (${totalSynced} cards so far)`);
  }

  console.log(`[cards:sync] Sync complete. ${totalSynced} cards processed.`);
}

export function registerCardJobs(): void {
  // Sync cards daily (24 hours)
  scheduler.register("cards:sync", syncCards, 24 * 60 * 60 * 1000);
}

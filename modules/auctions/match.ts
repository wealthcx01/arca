/**
 * Matches a raw eBay listing title to an ARCA catalog card + extracts grading info.
 *
 * eBay listings carry no structured card/grade fields — everything is inferred from
 * free-text titles like `"1999 Pokemon Base Set Charizard 4/102 Holo PSA 10 GEM MINT"`.
 * A listing that can't be confidently matched (missing grade, or no unambiguous card
 * match) must be dropped by the caller rather than stored with a guessed card_id.
 */

// Pokemon TCG API set ids (matches modules/cards `set_code`) for sets produced under the
// Wizards of the Coast license: Base Set through Skyridge (1999–2003), pre-EX era.
export const WOTC_ERA_SET_CODES: ReadonlySet<string> = new Set([
  "base1", // Base Set
  "base2", // Jungle
  "base3", // Fossil
  "base4", // Base Set 2
  "base5", // Team Rocket
  "base6", // Legendary Collection
  "gym1", // Gym Heroes
  "gym2", // Gym Challenge
  "neo1", // Neo Genesis
  "neo2", // Neo Discovery
  "neo3", // Neo Revelation
  "neo4", // Neo Destiny
  "ecard1", // Expedition Base Set
  "ecard2", // Aquapolis
  "ecard3", // Skyridge
  "basep", // Wizards Black Star Promos
]);

export interface GradeInfo {
  grading_company: "PSA" | "BGS";
  grade: string;
}

/** Parse a PSA/BGS grading company + numeric grade out of a listing title. Returns null for ungraded/raw listings. */
export function parseGrade(title: string): GradeInfo | null {
  const psaMatch = title.match(/\bPSA\s*(10|[1-9](?:\.5)?)\b/i);
  if (psaMatch) return { grading_company: "PSA", grade: psaMatch[1] as string };

  const bgsMatch = title.match(/\bBGS\s*(10|[1-9](?:\.5)?)\b/i);
  if (bgsMatch) return { grading_company: "BGS", grade: bgsMatch[1] as string };

  return null;
}

export interface CatalogCandidate {
  id: string;
  name: string;
  set_name: string;
  set_code: string;
  card_number: string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Match a listing title against a pre-filtered list of WOTC-era catalog candidates.
 * Requires the card name to appear in the title AND at least one of (set name, card
 * number) to also appear, to avoid false-positives on common names. Ties between two
 * distinct cards at the same confidence score are treated as unmatched.
 */
export function matchCardFromTitle(
  title: string,
  candidates: CatalogCandidate[],
): CatalogCandidate | null {
  const normalized = title.toLowerCase();
  let best: { candidate: CatalogCandidate; score: number } | null = null;
  let bestIsTie = false;

  for (const candidate of candidates) {
    const nameRe = new RegExp(`\\b${escapeRegex(candidate.name.toLowerCase())}\\b`);
    if (!nameRe.test(normalized)) continue;

    let score = 2;
    if (normalized.includes(candidate.set_name.toLowerCase())) score += 1;

    const numRe = new RegExp(`\\b${escapeRegex(candidate.card_number)}\\s*/`, "i");
    if (numRe.test(title) || normalized.includes(`#${candidate.card_number.toLowerCase()}`)) {
      score += 1;
    }

    if (!best || score > best.score) {
      best = { candidate, score };
      bestIsTie = false;
    } else if (score === best.score && best.candidate.id !== candidate.id) {
      bestIsTie = true;
    }
  }

  if (!best || bestIsTie || best.score < 3) return null;
  return best.candidate;
}

export interface MatchedListing {
  card_id: string;
  grading_company: string;
  grade: string;
}

/** Full match: requires both a confident card match and a parsed grade. */
export function matchListing(title: string, candidates: CatalogCandidate[]): MatchedListing | null {
  const grade = parseGrade(title);
  if (!grade) return null;

  const card = matchCardFromTitle(title, candidates);
  if (!card) return null;

  return { card_id: card.id, grading_company: grade.grading_company, grade: grade.grade };
}

import { describe, expect, test } from "bun:test";
import { matchCardFromTitle, matchListing, parseGrade } from "./match.ts";
import type { CatalogCandidate } from "./match.ts";

const CHARIZARD: CatalogCandidate = {
  id: "card-charizard-base1-4",
  name: "Charizard",
  set_name: "Base Set",
  set_code: "base1",
  card_number: "4",
};

const PIKACHU: CatalogCandidate = {
  id: "card-pikachu-base1-58",
  name: "Pikachu",
  set_name: "Base Set",
  set_code: "base1",
  card_number: "58",
};

const CANDIDATES: CatalogCandidate[] = [CHARIZARD, PIKACHU];

describe("parseGrade", () => {
  test("extracts a PSA grade", () => {
    expect(parseGrade("1999 Pokemon Base Set Charizard 4/102 Holo PSA 10 GEM MINT")).toEqual({
      grading_company: "PSA",
      grade: "10",
    });
  });

  test("extracts a BGS half-point grade", () => {
    expect(parseGrade("Pikachu 58/102 Base Set BGS 9.5")).toEqual({
      grading_company: "BGS",
      grade: "9.5",
    });
  });

  test("returns null for an ungraded/raw listing", () => {
    expect(parseGrade("1999 Pokemon Base Set Charizard 4/102 Holo Raw NM")).toBeNull();
  });
});

describe("matchCardFromTitle", () => {
  test("matches on name + set + card number", () => {
    const match = matchCardFromTitle(
      "1999 Pokemon Base Set Charizard 4/102 Holo PSA 10 GEM MINT",
      CANDIDATES,
    );
    expect(match?.id).toBe(CHARIZARD.id);
  });

  test("returns null when the card name isn't present in the title", () => {
    const match = matchCardFromTitle("1999 Pokemon Base Set Blastoise 2/102 PSA 10", CANDIDATES);
    expect(match).toBeNull();
  });

  test("returns null when only the name matches with no set/number confirmation", () => {
    // "Charizard" alone is too ambiguous across reprints/eras to trust without a
    // corroborating set name or card number in the title.
    const match = matchCardFromTitle("Charizard PSA 10", CANDIDATES);
    expect(match).toBeNull();
  });
});

describe("matchListing", () => {
  test("matches a confidently-graded, confidently-identified listing", () => {
    const result = matchListing(
      "1999 Pokemon Base Set Charizard 4/102 Holo PSA 10 GEM MINT",
      CANDIDATES,
    );
    expect(result).toEqual({
      card_id: CHARIZARD.id,
      grading_company: "PSA",
      grade: "10",
    });
  });

  test("returns null for an ungraded listing even if the card matches", () => {
    const result = matchListing("1999 Pokemon Base Set Charizard 4/102 Holo Raw NM", CANDIDATES);
    expect(result).toBeNull();
  });

  test("returns null for a graded listing that can't be matched to the catalog", () => {
    const result = matchListing("Some Sports Card PSA 10", CANDIDATES);
    expect(result).toBeNull();
  });
});

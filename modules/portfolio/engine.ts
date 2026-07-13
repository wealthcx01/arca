import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { holdings, transactions } from "./schema";

/**
 * Rebuild holdings for a specific portfolio + card + condition/grade combination.
 * Uses weighted average cost method.
 */
export async function rebuildHoldings(
  portfolioId: string,
  cardId: string,
  condition?: string | null,
  grade?: string | null,
): Promise<void> {
  const db = getDb();

  // Get all transactions for this group sorted by trade_date
  const txns = db
    .select()
    .from(transactions)
    .where(and(eq(transactions.portfolio_id, portfolioId), eq(transactions.card_id, cardId)))
    .orderBy(asc(transactions.trade_date))
    .all();

  // Filter by condition/grade if specified
  const filtered = txns.filter((t) => {
    if (condition !== undefined && t.condition !== condition) return false;
    if (grade !== undefined && t.grade !== grade) return false;
    return true;
  });

  let qty = 0;
  let avgCostCents = 0;
  let totalCostBasisCents = 0;
  let firstBoughtAt: Date | null = null;
  let currency = "USD";
  let holdingCondition: string | null = null;
  let isGraded = false;
  let gradingCompany: string | null = null;
  let holdingGrade: string | null = null;
  let certNumber: string | null = null;

  for (const txn of filtered) {
    currency = txn.currency;
    holdingCondition = txn.condition;
    isGraded = txn.is_graded ?? false;
    gradingCompany = txn.grading_company;
    holdingGrade = txn.grade;
    certNumber = txn.cert_number;

    if (txn.type === "BUY") {
      // Include shipping, fees, taxes in total cost
      const totalTxnCost =
        txn.price_cents * txn.quantity +
        (txn.shipping_cents ?? 0) +
        (txn.fees_cents ?? 0) +
        (txn.taxes_cents ?? 0);

      if (qty === 0) {
        avgCostCents = Math.round(totalTxnCost / txn.quantity);
        firstBoughtAt = txn.trade_date;
      } else {
        avgCostCents = Math.round((qty * avgCostCents + totalTxnCost) / (qty + txn.quantity));
      }
      qty += txn.quantity;
      totalCostBasisCents = qty * avgCostCents;
    } else if (txn.type === "SELL") {
      // Average cost stays same on sell
      qty -= txn.quantity;
      if (qty < 0) qty = 0;
      totalCostBasisCents = qty * avgCostCents;
    }
  }

  // Delete existing holdings for this group
  // Build conditions for the delete query
  const existingHoldings = db
    .select()
    .from(holdings)
    .where(and(eq(holdings.portfolio_id, portfolioId), eq(holdings.card_id, cardId)))
    .all();

  for (const h of existingHoldings) {
    if (h.condition === (condition ?? null) && h.grade === (grade ?? null)) {
      db.delete(holdings).where(eq(holdings.id, h.id)).run();
    }
  }

  // Insert new holding if quantity > 0
  if (qty > 0) {
    db.insert(holdings)
      .values({
        portfolio_id: portfolioId,
        card_id: cardId,
        quantity: qty,
        avg_cost_cents: avgCostCents,
        total_cost_basis_cents: totalCostBasisCents,
        currency,
        condition: holdingCondition,
        is_graded: isGraded,
        grading_company: gradingCompany,
        grade: holdingGrade,
        cert_number: certNumber,
        first_bought_at: firstBoughtAt,
      })
      .run();
  }
}

/**
 * Rebuild all holdings for a portfolio.
 */
export async function rebuildAllHoldings(portfolioId: string): Promise<void> {
  const db = getDb();

  // Get all unique card+condition+grade groups
  const txns = db
    .select()
    .from(transactions)
    .where(eq(transactions.portfolio_id, portfolioId))
    .all();

  const groups = new Set<string>();
  for (const txn of txns) {
    groups.add(`${txn.card_id}|${txn.condition ?? ""}|${txn.grade ?? ""}`);
  }

  for (const group of groups) {
    const [cardId, condition, grade] = group.split("|");
    if (!cardId) continue;
    await rebuildHoldings(portfolioId, cardId, condition || null, grade || null);
  }
}

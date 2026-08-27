import { X } from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api";
import { CardSearch } from "../cards/CardSearch";

interface AddHoldingDialogProps {
  portfolioId: string;
  preselectedCardId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddHoldingDialog({
  portfolioId,
  preselectedCardId,
  onClose,
  onSuccess,
}: AddHoldingDialogProps) {
  const [cardId, setCardId] = useState(preselectedCardId || "");
  const [cardName, setCardName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [pricePounds, setPricePounds] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [condition, setCondition] = useState("NM");
  const [isGraded, setIsGraded] = useState(false);
  const [gradingCompany, setGradingCompany] = useState("PSA");
  const [grade, setGrade] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split("T")[0] || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardId) {
      setError("Please select a card");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const priceCents = Math.round(Number.parseFloat(pricePounds || "0") * 100);
      await api.post(`/portfolio/${portfolioId}/transactions`, {
        card_id: cardId,
        type: "BUY",
        quantity,
        price_cents: priceCents,
        currency,
        trade_date: new Date(tradeDate).toISOString(),
        condition: isGraded ? undefined : condition,
        is_graded: isGraded,
        grading_company: isGraded ? gradingCompany : undefined,
        grade: isGraded ? grade : undefined,
        cert_number: isGraded ? certNumber : undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add holding");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-4">
      <div className="w-full rounded-t-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-xl md:max-w-lg md:rounded-lg">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-sm font-semibold">Add Card to Portfolio</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-[var(--color-muted)]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto p-4">
          {error && (
            <div className="mb-3 rounded bg-[color-mix(in_srgb,var(--color-negative)_10%,var(--color-card))] p-2 text-sm text-[var(--color-negative)]">
              {error}
            </div>
          )}

          {/* Card search */}
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium">Card</label>
            {cardId ? (
              <div className="flex items-center justify-between rounded border border-[var(--color-border)] px-3 py-2">
                <span className="text-sm">{cardName || cardId}</span>
                <button
                  type="button"
                  onClick={() => {
                    setCardId("");
                    setCardName("");
                  }}
                  className="text-xs text-[var(--color-primary)]"
                >
                  Change
                </button>
              </div>
            ) : (
              <CardSearch
                onSelect={(card) => {
                  setCardId(card.id);
                  setCardName(card.name);
                }}
              />
            )}
          </div>

          {/* Quantity + Price row */}
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Quantity</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
                className="w-full rounded border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Price per card</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={pricePounds}
                onChange={(e) => setPricePounds(e.target.value)}
                placeholder="0.00"
                className="w-full rounded border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          {/* Currency + Date row */}
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-1.5 text-sm"
              >
                <option value="GBP">GBP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="SGD">SGD</option>
                <option value="HKD">HKD</option>
                <option value="JPY">JPY</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Trade Date</label>
              <input
                type="date"
                value={tradeDate}
                onChange={(e) => setTradeDate(e.target.value)}
                className="w-full rounded border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          {/* Condition */}
          <div className="mb-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isGraded}
                  onChange={(e) => setIsGraded(e.target.checked)}
                  className="rounded"
                />
                Graded card
              </label>
            </div>
          </div>

          {isGraded ? (
            <div className="mb-3 grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Company</label>
                <select
                  value={gradingCompany}
                  onChange={(e) => setGradingCompany(e.target.value)}
                  className="w-full rounded border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-1.5 text-sm"
                >
                  <option value="PSA">PSA</option>
                  <option value="BGS">BGS</option>
                  <option value="CGC">CGC</option>
                  <option value="ACE">ACE</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Grade</label>
                <input
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="10"
                  className="w-full rounded border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Cert #</label>
                <input
                  type="text"
                  value={certNumber}
                  onChange={(e) => setCertNumber(e.target.value)}
                  placeholder="12345678"
                  className="w-full rounded border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-1.5 text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full rounded border border-[var(--color-input)] bg-[var(--color-background)] px-3 py-1.5 text-sm"
              >
                <option value="NM">Near Mint (NM)</option>
                <option value="LP">Lightly Played (LP)</option>
                <option value="MP">Moderately Played (MP)</option>
                <option value="HP">Heavily Played (HP)</option>
                <option value="DMG">Damaged (DMG)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !cardId}
            className="mt-2 w-full rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add to Portfolio"}
          </button>
        </form>
      </div>
    </div>
  );
}

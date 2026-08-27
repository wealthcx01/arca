import { ArrowLeft, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { ArcaScoreBadge } from "../components/analytics/ArcaScoreBadge";
import { GradingAlphaPanel } from "../components/analytics/GradingAlphaPanel";
import { RiskMetrics } from "../components/analytics/RiskMetrics";
import { TechnicalSummary } from "../components/analytics/TechnicalSummary";
import { CandlestickChart } from "../components/charts/CandlestickChart";
import { IndicatorPane } from "../components/charts/IndicatorPane";
import { AddHoldingDialog } from "../components/portfolio/AddHoldingDialog";
import { PriceFreshness } from "../components/pricing/PriceFreshness";
import { SourceBadge } from "../components/pricing/SourceBadge";
import { DataPanel } from "../components/terminal/DataPanel";
import { CardImage } from "../components/ui/CardImage";
import { CardDetailSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toaster";
import { api } from "../lib/api";
import { formatMoney } from "../lib/money";

interface Card {
  id: string;
  name: string;
  set_name: string;
  set_code: string;
  card_number: string;
  rarity: string | null;
  image_url: string | null;
  image_url_hires: string | null;
  supertype: string;
  types: string | null;
  hp: number | null;
  artist: string | null;
}

interface ConflatedPrice {
  card_id: string;
  variant: string;
  market_price_cents: number | null;
  market_source: string | null;
  market_fetched_at: number | null;
  low_price_cents: number | null;
  low_source: string | null;
  low_fetched_at: number | null;
  mid_price_cents: number | null;
  mid_source: string | null;
  mid_fetched_at: number | null;
  high_price_cents: number | null;
  high_source: string | null;
  high_fetched_at: number | null;
  currency: string;
}

interface PriceData {
  source: string;
  variant: string;
  market_price_cents: number | null;
  low_price_cents: number | null;
  mid_price_cents: number | null;
  high_price_cents: number | null;
  currency: string;
  fetched_at: string | number | null;
}

interface GradedPrice {
  grading_company: string;
  grade: string;
  price_cents: number;
  currency: string;
  source: string;
  sale_type: string;
  fetched_at: string | number | null;
}

interface AnalyticsSummary {
  volatility_e6: number | null;
  sharpe_e6: number | null;
  max_drawdown_bp: number | null;
  liquidity_score: number | null;
  trend_score: number | null;
  vwap_cents: number | null;
  arca_score: number | null;
}

export function CardDetailPage() {
  const cardId = window.location.pathname.split("/cards/")[1] || "";
  const { toast } = useToast();
  const [card, setCard] = useState<Card | null>(null);
  const [conflated, setConflated] = useState<ConflatedPrice[]>([]);
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [gradedPrices, setGradedPrices] = useState<GradedPrice[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showIndicatorPane, setShowIndicatorPane] = useState<"RSI_14" | "MACD" | null>(null);

  const isDark = document.documentElement.classList.contains("dark");

  useEffect(() => {
    if (!cardId) return;
    setLoading(true);
    setError(null);

    Promise.allSettled([
      api.get<{ data: Card }>(`/cards/${cardId}`).then((d) => d.data),
      api
        .get<{ conflated: ConflatedPrice[] }>(`/pricing/${cardId}/conflated`)
        .then((d) => d.conflated),
      api
        .get<{ prices: Record<string, Record<string, PriceData>> }>(`/pricing/${cardId}`)
        .then((d) => {
          const flat: PriceData[] = [];
          for (const sourceGroup of Object.values(d.prices)) {
            for (const price of Object.values(sourceGroup)) flat.push(price);
          }
          return flat;
        }),
      api
        .get<{ graded_prices: GradedPrice[] }>(`/pricing/${cardId}/graded`)
        .then((d) => d.graded_prices),
      api
        .get<{ data: AnalyticsSummary }>(`/analytics/${cardId}/summary`)
        .then((d) => d.data)
        .catch(() => null),
    ])
      .then(([cardR, confR, pricesR, gradedR, analyticsR]) => {
        if (cardR.status === "fulfilled") setCard(cardR.value);
        else {
          setError("Failed to load card");
          toast.error("Failed to load card");
        }
        setConflated(confR.status === "fulfilled" ? confR.value : []);
        setPrices(pricesR.status === "fulfilled" ? pricesR.value : []);
        setGradedPrices(gradedR.status === "fulfilled" ? gradedR.value : []);
        setAnalytics(analyticsR.status === "fulfilled" ? analyticsR.value : null);
      })
      .finally(() => setLoading(false));
  }, [cardId, toast]);

  if (loading) return <CardDetailSkeleton />;
  if (error || !card) {
    return (
      <div className="space-y-4">
        <a
          href="/cards"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          <ArrowLeft size={14} /> Back to cards
        </a>
        <div className="flex h-48 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] text-sm text-[var(--color-negative)]">
          {error || "Card not found"}
        </div>
      </div>
    );
  }

  const bestPrice = conflated[0];
  const currentPrice = bestPrice?.market_price_cents;
  const imgSrc = card.image_url_hires || card.image_url;

  return (
    <div className="space-y-4">
      {/* Terminal header bar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 font-mono text-xs">
        <a
          href="/cards"
          className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          <ArrowLeft size={12} className="inline" /> CARDS
        </a>
        <span className="text-[var(--color-border)]">|</span>
        <span className="font-semibold text-[var(--color-foreground)]">{card.name}</span>
        <span className="text-[var(--color-border)]">|</span>
        <span className="text-[var(--color-muted-foreground)]">
          {card.set_name} #{card.card_number}
        </span>
        {card.rarity && (
          <>
            <span className="text-[var(--color-border)]">|</span>
            <span className="text-[var(--color-muted-foreground)]">{card.rarity}</span>
          </>
        )}
        {currentPrice && bestPrice && (
          <>
            <span className="text-[var(--color-border)]">|</span>
            <span className="font-semibold text-[var(--color-primary)]">
              {formatMoney(currentPrice, bestPrice.currency)}
            </span>
          </>
        )}
        {analytics?.vwap_cents && (
          <>
            <span className="text-[var(--color-border)]">|</span>
            <span className="text-[var(--color-muted-foreground)]">
              VWAP {formatMoney(analytics.vwap_cents, "USD")}
            </span>
          </>
        )}
        <span className="text-[var(--color-border)]">|</span>
        <ArcaScoreBadge score={analytics?.arca_score ?? null} size="sm" />
      </div>

      {/* Main content: chart + side panel */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Left: Chart + Indicators */}
        <div className="space-y-3">
          <DataPanel title="Price Chart" headerColor="primary">
            <div className="p-3">
              <CandlestickChart cardId={cardId} isDark={isDark} height={350} />
            </div>
          </DataPanel>

          {/* Indicator pane toggles */}
          <div className="flex gap-1 font-mono text-[10px]">
            <button
              onClick={() => setShowIndicatorPane(showIndicatorPane === "RSI_14" ? null : "RSI_14")}
              className={`rounded border px-2 py-1 ${showIndicatorPane === "RSI_14" ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)]"}`}
            >
              RSI
            </button>
            <button
              onClick={() => setShowIndicatorPane(showIndicatorPane === "MACD" ? null : "MACD")}
              className={`rounded border px-2 py-1 ${showIndicatorPane === "MACD" ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-muted-foreground)]"}`}
            >
              MACD
            </button>
          </div>

          {showIndicatorPane && (
            <IndicatorPane
              cardId={cardId}
              indicator={showIndicatorPane}
              period="3M"
              isDark={isDark}
              height={150}
            />
          )}

          {/* Conflated best prices */}
          {conflated.length > 0 && (
            <DataPanel title="Best Price (Conflated)">
              <div className="overflow-x-auto">
                <table className="w-full text-sm terminal-dense">
                  <thead>
                    <tr className="text-left text-[10px] font-medium uppercase text-[var(--color-muted-foreground)]">
                      <th className="px-2 py-1">Variant</th>
                      <th className="px-2 py-1 text-right">Market</th>
                      <th className="px-2 py-1 text-right">Low</th>
                      <th className="px-2 py-1 text-right">Mid</th>
                      <th className="px-2 py-1 text-right">High</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conflated.map((cp) => (
                      <tr key={cp.variant} className="border-t border-[var(--color-border)]">
                        <td className="px-2 py-1 font-mono text-xs capitalize">{cp.variant}</td>
                        <td className="px-2 py-1 text-right">
                          <span className="font-mono tabular-nums">
                            {cp.market_price_cents
                              ? formatMoney(cp.market_price_cents, cp.currency)
                              : "—"}
                          </span>
                          {cp.market_price_cents != null && (
                            <div className="mt-0.5 flex flex-col items-end gap-0.5">
                              {cp.market_source && <SourceBadge source={cp.market_source} />}
                              <PriceFreshness fetchedAt={cp.market_fetched_at} />
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1 text-right font-mono tabular-nums text-[var(--color-muted-foreground)]">
                          {cp.low_price_cents ? formatMoney(cp.low_price_cents, cp.currency) : "—"}
                          {cp.low_price_cents != null && (
                            <div className="mt-0.5">
                              <PriceFreshness fetchedAt={cp.low_fetched_at} />
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1 text-right font-mono tabular-nums text-[var(--color-muted-foreground)]">
                          {cp.mid_price_cents ? formatMoney(cp.mid_price_cents, cp.currency) : "—"}
                          {cp.mid_price_cents != null && (
                            <div className="mt-0.5">
                              <PriceFreshness fetchedAt={cp.mid_fetched_at} />
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1 text-right font-mono tabular-nums text-[var(--color-muted-foreground)]">
                          {cp.high_price_cents
                            ? formatMoney(cp.high_price_cents, cp.currency)
                            : "—"}
                          {cp.high_price_cents != null && (
                            <div className="mt-0.5">
                              <PriceFreshness fetchedAt={cp.high_fetched_at} />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DataPanel>
          )}
        </div>

        {/* Right: Side panel */}
        <div className="space-y-3">
          {/* Card image */}
          <div>
            <CardImage
              src={imgSrc}
              alt={card.name}
              className="aspect-[2.5/3.5] w-full rounded-lg object-cover shadow-lg"
            />
          </div>

          {/* Technical summary */}
          {analytics && (
            <DataPanel title="Technical Summary">
              <div className="p-3">
                <TechnicalSummary
                  rsi={undefined} // Would need RSI from indicators API
                  trendScore={analytics.trend_score ?? 0}
                  macdSignal={
                    (analytics.trend_score ?? 0) > 20
                      ? "bullish"
                      : (analytics.trend_score ?? 0) < -20
                        ? "bearish"
                        : "neutral"
                  }
                />
              </div>
            </DataPanel>
          )}

          {/* Risk metrics */}
          {analytics && (
            <DataPanel title="Key Statistics">
              <div className="p-3">
                <RiskMetrics
                  volatility_e6={analytics.volatility_e6}
                  sharpe_e6={analytics.sharpe_e6}
                  max_drawdown_bp={analytics.max_drawdown_bp}
                  liquidity_score={analytics.liquidity_score}
                />
              </div>
            </DataPanel>
          )}

          {/* ARCA Score */}
          {analytics?.arca_score != null && (
            <DataPanel title="ARCA Score">
              <div className="flex items-center justify-center p-4">
                <ArcaScoreBadge score={analytics.arca_score} size="lg" showLabel />
              </div>
            </DataPanel>
          )}

          {/* Source attribution */}
          {prices.length > 0 && (
            <DataPanel title={`All Sources (${prices.length})`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm terminal-dense">
                  <thead>
                    <tr className="text-left text-[10px] font-medium uppercase text-[var(--color-muted-foreground)]">
                      <th className="px-2 py-1">Source</th>
                      <th className="px-2 py-1 text-right">Market</th>
                      <th className="px-2 py-1 text-right">Mid</th>
                      <th className="px-2 py-1 text-right">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((p, i) => (
                      <tr key={i} className="border-t border-[var(--color-border)]">
                        <td className="px-2 py-1">
                          <SourceBadge source={p.source} />
                        </td>
                        <td className="px-2 py-1 text-right font-mono tabular-nums">
                          {p.market_price_cents
                            ? formatMoney(p.market_price_cents, p.currency)
                            : "—"}
                        </td>
                        <td className="px-2 py-1 text-right font-mono tabular-nums text-[var(--color-muted-foreground)]">
                          {p.mid_price_cents ? formatMoney(p.mid_price_cents, p.currency) : "—"}
                        </td>
                        <td className="px-2 py-1 text-right">
                          <PriceFreshness fetchedAt={p.fetched_at} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DataPanel>
          )}

          <button
            onClick={() => setShowAddDialog(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus size={14} /> Add to Portfolio
          </button>
        </div>
      </div>

      {/* Bottom section: Grading Alpha + Graded Prices */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Grading Alpha */}
        <DataPanel title="Grading Alpha (ROI)">
          <GradingAlphaPanel cardId={cardId} />
        </DataPanel>

        {/* Graded Prices */}
        {gradedPrices.length > 0 && (
          <DataPanel title="Graded Prices">
            <div className="overflow-x-auto">
              <table className="w-full text-sm terminal-dense">
                <thead>
                  <tr className="text-left text-[10px] font-medium uppercase text-[var(--color-muted-foreground)]">
                    <th className="px-2 py-1">Company</th>
                    <th className="px-2 py-1">Grade</th>
                    <th className="px-2 py-1 text-right">Price</th>
                    <th className="px-2 py-1">Type</th>
                    <th className="px-2 py-1">Source</th>
                    <th className="px-2 py-1 text-right">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {gradedPrices.map((gp, i) => (
                    <tr key={i} className="border-t border-[var(--color-border)]">
                      <td className="px-2 py-1 font-medium">{gp.grading_company}</td>
                      <td className="px-2 py-1 font-mono">{gp.grade}</td>
                      <td className="px-2 py-1 text-right font-mono tabular-nums">
                        {formatMoney(gp.price_cents, gp.currency)}
                      </td>
                      <td className="px-2 py-1 text-[var(--color-muted-foreground)]">
                        {gp.sale_type}
                      </td>
                      <td className="px-2 py-1">
                        <SourceBadge source={gp.source} />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <PriceFreshness fetchedAt={gp.fetched_at} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataPanel>
        )}
      </div>

      {showAddDialog && (
        <AddHoldingDialog
          portfolioId=""
          preselectedCardId={card.id}
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => setShowAddDialog(false)}
        />
      )}
    </div>
  );
}

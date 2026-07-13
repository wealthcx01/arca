/**
 * Technical indicators engine — all integer math, no floating point in storage.
 *
 * All functions take OHLC arrays (sorted by date ascending) and return
 * integer-scaled results (value × 1,000,000 = _e6).
 */

export interface OHLCBar {
  date: string;
  open_cents: number;
  high_cents: number;
  low_cents: number;
  close_cents: number;
}

export interface IndicatorPoint {
  date: string;
  value_e6: number;
}

const SCALE = 1_000_000;

/**
 * SMA — Simple Moving Average.
 * Returns cents × 1M for each date where we have enough data.
 */
export function sma(bars: OHLCBar[], period: number): IndicatorPoint[] {
  if (bars.length < period) return [];

  const results: IndicatorPoint[] = [];
  let sum = 0;

  for (let i = 0; i < period; i++) {
    sum += bars[i]!.close_cents;
  }
  results.push({
    date: bars[period - 1]!.date,
    value_e6: Math.round((sum / period) * SCALE),
  });

  for (let i = period; i < bars.length; i++) {
    sum += bars[i]!.close_cents - bars[i - period]!.close_cents;
    results.push({
      date: bars[i]!.date,
      value_e6: Math.round((sum / period) * SCALE),
    });
  }

  return results;
}

/**
 * EMA — Exponential Moving Average.
 * k = 2 / (period + 1), all in scaled integer math.
 */
export function ema(bars: OHLCBar[], period: number): IndicatorPoint[] {
  if (bars.length < period) return [];

  // Start with SMA of first `period` bars as seed
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += bars[i]!.close_cents;
  }
  let emaValue = sum / period; // in cents (float for precision during calc)

  const k = 2 / (period + 1);
  const results: IndicatorPoint[] = [
    { date: bars[period - 1]!.date, value_e6: Math.round(emaValue * SCALE) },
  ];

  for (let i = period; i < bars.length; i++) {
    emaValue = bars[i]!.close_cents * k + emaValue * (1 - k);
    results.push({
      date: bars[i]!.date,
      value_e6: Math.round(emaValue * SCALE),
    });
  }

  return results;
}

/**
 * RSI — Relative Strength Index.
 * Result 0-100 × 1M.
 */
export function rsi(bars: OHLCBar[], period = 14): IndicatorPoint[] {
  if (bars.length < period + 1) return [];

  const changes: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    changes.push(bars[i]!.close_cents - bars[i - 1]!.close_cents);
  }

  // Initial average gain/loss
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    const change = changes[i]!;
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  const results: IndicatorPoint[] = [];

  const computeRsi = (ag: number, al: number) => {
    if (al === 0) return 100 * SCALE;
    const rs = ag / al;
    return Math.round((100 - 100 / (1 + rs)) * SCALE);
  };

  results.push({
    date: bars[period]!.date,
    value_e6: computeRsi(avgGain, avgLoss),
  });

  // Smoothed RSI
  for (let i = period; i < changes.length; i++) {
    const change = changes[i]!;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    results.push({
      date: bars[i + 1]!.date,
      value_e6: computeRsi(avgGain, avgLoss),
    });
  }

  return results;
}

/**
 * MACD — Moving Average Convergence Divergence.
 * Returns MACD line, signal line, and histogram.
 */
export function macd(
  bars: OHLCBar[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): { macd: IndicatorPoint[]; signal: IndicatorPoint[]; histogram: IndicatorPoint[] } {
  const fastEma = ema(bars, fastPeriod);
  const slowEma = ema(bars, slowPeriod);

  if (fastEma.length === 0 || slowEma.length === 0) {
    return { macd: [], signal: [], histogram: [] };
  }

  // Align by date — MACD = fast EMA - slow EMA
  const slowDates = new Map(slowEma.map((p) => [p.date, p.value_e6]));
  const macdLine: IndicatorPoint[] = [];

  for (const fast of fastEma) {
    const slow = slowDates.get(fast.date);
    if (slow !== undefined) {
      macdLine.push({
        date: fast.date,
        value_e6: fast.value_e6 - slow,
      });
    }
  }

  // Signal line = EMA(9) of MACD values
  // Convert MACD to pseudo-bars for EMA calculation
  const macdBars: OHLCBar[] = macdLine.map((p) => ({
    date: p.date,
    open_cents: p.value_e6 / SCALE,
    high_cents: p.value_e6 / SCALE,
    low_cents: p.value_e6 / SCALE,
    close_cents: p.value_e6 / SCALE,
  }));

  // Manual EMA on the scaled values directly
  const signalLine: IndicatorPoint[] = [];
  if (macdLine.length >= signalPeriod) {
    let sum = 0;
    for (let i = 0; i < signalPeriod; i++) {
      sum += macdLine[i]!.value_e6;
    }
    let sigEma = sum / signalPeriod;
    const k = 2 / (signalPeriod + 1);

    signalLine.push({
      date: macdLine[signalPeriod - 1]!.date,
      value_e6: Math.round(sigEma),
    });

    for (let i = signalPeriod; i < macdLine.length; i++) {
      sigEma = macdLine[i]!.value_e6 * k + sigEma * (1 - k);
      signalLine.push({
        date: macdLine[i]!.date,
        value_e6: Math.round(sigEma),
      });
    }
  }

  // Histogram = MACD - Signal
  const signalDates = new Map(signalLine.map((p) => [p.date, p.value_e6]));
  const histogram: IndicatorPoint[] = [];
  for (const m of macdLine) {
    const sig = signalDates.get(m.date);
    if (sig !== undefined) {
      histogram.push({
        date: m.date,
        value_e6: m.value_e6 - sig,
      });
    }
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * Bollinger Bands — SMA ± mult × stddev.
 * Returns upper, middle (SMA), lower — all in cents × 1M.
 */
export function bollingerBands(
  bars: OHLCBar[],
  period = 20,
  mult = 2,
): { upper: IndicatorPoint[]; middle: IndicatorPoint[]; lower: IndicatorPoint[] } {
  if (bars.length < period) {
    return { upper: [], middle: [], lower: [] };
  }

  const middle = sma(bars, period);
  const upper: IndicatorPoint[] = [];
  const lower: IndicatorPoint[] = [];

  for (let i = 0; i < middle.length; i++) {
    const startIdx = i; // sma output starts at index (period-1) of bars
    const slice = bars.slice(startIdx, startIdx + period);
    const mean = slice.reduce((s, b) => s + b.close_cents, 0) / period;

    let variance = 0;
    for (const b of slice) {
      const diff = b.close_cents - mean;
      variance += diff * diff;
    }
    const stddev = Math.sqrt(variance / period);
    const bandWidth = Math.round(stddev * mult * SCALE);

    upper.push({
      date: middle[i]!.date,
      value_e6: middle[i]!.value_e6 + bandWidth,
    });
    lower.push({
      date: middle[i]!.date,
      value_e6: middle[i]!.value_e6 - bandWidth,
    });
  }

  return { upper, middle, lower };
}

/**
 * ATR — Average True Range.
 * max(H-L, |H-prevC|, |L-prevC|) averaged over period.
 * Result in cents × 1M.
 */
export function atr(bars: OHLCBar[], period = 14): IndicatorPoint[] {
  if (bars.length < period + 1) return [];

  const trueRanges: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const high = bars[i]!.high_cents;
    const low = bars[i]!.low_cents;
    const prevClose = bars[i - 1]!.close_cents;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trueRanges.push(tr);
  }

  // Initial ATR = average of first `period` true ranges
  let atrValue = 0;
  for (let i = 0; i < period; i++) {
    atrValue += trueRanges[i]!;
  }
  atrValue /= period;

  const results: IndicatorPoint[] = [
    { date: bars[period]!.date, value_e6: Math.round(atrValue * SCALE) },
  ];

  // Smoothed ATR
  for (let i = period; i < trueRanges.length; i++) {
    atrValue = (atrValue * (period - 1) + trueRanges[i]!) / period;
    results.push({
      date: bars[i + 1]!.date,
      value_e6: Math.round(atrValue * SCALE),
    });
  }

  return results;
}

/**
 * ROC — Rate of Change.
 * ((close - close_n_ago) / close_n_ago) × 1M.
 */
export function roc(bars: OHLCBar[], period: number): IndicatorPoint[] {
  if (bars.length <= period) return [];

  const results: IndicatorPoint[] = [];
  for (let i = period; i < bars.length; i++) {
    const current = bars[i]!.close_cents;
    const past = bars[i - period]!.close_cents;
    if (past === 0) continue;
    results.push({
      date: bars[i]!.date,
      value_e6: Math.round(((current - past) / past) * SCALE),
    });
  }

  return results;
}

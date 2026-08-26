/** Shared chart types for the lightweight-charts integration. */

export interface OHLCData {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface LineData {
  time: string;
  value: number;
}

export interface HistogramData {
  time: string;
  value: number;
  color?: string;
}

export interface IndicatorData {
  name: string;
  data: LineData[];
  color?: string;
}

export interface ChartTheme {
  background: string;
  textColor: string;
  gridColor: string;
  borderColor: string;
  upColor: string;
  downColor: string;
  primaryColor: string;
  secondaryColor: string;
  crosshairColor: string;
}

/**
 * lightweight-charts renders to a <canvas>, so it can't read CSS custom properties —
 * these literals must be kept in lockstep with the Diamond/Pearl palettes in index.css.
 */
export function getChartTheme(isDark: boolean): ChartTheme {
  if (isDark) {
    return {
      background: "#100F0D",
      textColor: "#8F897A",
      gridColor: "#262420",
      borderColor: "#262420",
      upColor: "#3ECF8E",
      downColor: "#EF5350",
      primaryColor: "#C9A860",
      secondaryColor: "#6F92A8",
      crosshairColor: "#C9A860",
    };
  }
  return {
    background: "#FFFDF7",
    textColor: "#6F6754",
    gridColor: "#DDD2B8",
    borderColor: "#DDD2B8",
    upColor: "#157347",
    downColor: "#B91C1C",
    primaryColor: "#7A5B1E",
    secondaryColor: "#3F5F74",
    crosshairColor: "#7A5B1E",
  };
}

/** Overlay-line colors for technical indicators, kept in the same restrained palette family as the theme. */
export function getIndicatorColors(isDark: boolean): Record<string, string> {
  if (isDark) {
    return {
      SMA_10: "#D9BC7E",
      SMA_20: "#6F92A8",
      SMA_50: "#9C7A4A",
      EMA_12: "#5B9E8F",
      EMA_26: "#B87D7D",
      BB_UPPER: "#5A5648",
      BB_LOWER: "#5A5648",
    };
  }
  return {
    SMA_10: "#9C7A2E",
    SMA_20: "#3F5F74",
    SMA_50: "#8A6A3F",
    EMA_12: "#3F7566",
    EMA_26: "#8F4F4F",
    BB_UPPER: "#8A8270",
    BB_LOWER: "#8A8270",
  };
}

export type ChartPeriod = "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

export const PERIOD_DAYS: Record<ChartPeriod, number> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  ALL: 365,
};

export type ChartType = "candlestick" | "line" | "area";

export type IndicatorType =
  | "SMA_10"
  | "SMA_20"
  | "SMA_50"
  | "EMA_12"
  | "EMA_26"
  | "RSI_14"
  | "MACD"
  | "BB_UPPER"
  | "BB_LOWER"
  | "ATR_14";

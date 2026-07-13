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
  crosshairColor: string;
}

/** Map CSS variables to chart colors based on current theme. */
export function getChartTheme(isDark: boolean): ChartTheme {
  if (isDark) {
    return {
      background: "#0D1829",
      textColor: "#8899B0",
      gridColor: "#1C2D45",
      borderColor: "#1C2D45",
      upColor: "#34D399",
      downColor: "#F87171",
      primaryColor: "#4A8FE7",
      crosshairColor: "#4A8FE7",
    };
  }
  return {
    background: "#ffffff",
    textColor: "#78717A",
    gridColor: "#E5DDD6",
    borderColor: "#E5DDD6",
    upColor: "#16a34a",
    downColor: "#dc2626",
    primaryColor: "#B04A82",
    crosshairColor: "#B04A82",
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

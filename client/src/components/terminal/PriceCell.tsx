import { useEffect, useRef, useState } from "react";

interface PriceCellProps {
  value: number;
  prevValue?: number;
  format?: (v: number) => string;
  className?: string;
}

function defaultFormat(v: number): string {
  return (v / 100).toFixed(2);
}

export function PriceCell({
  value,
  prevValue,
  format = defaultFormat,
  className = "",
}: PriceCellProps) {
  const [flashClass, setFlashClass] = useState("");
  const prevRef = useRef(prevValue ?? value);

  useEffect(() => {
    if (value !== prevRef.current) {
      setFlashClass(value > prevRef.current ? "flash-up" : "flash-down");
      prevRef.current = value;
      const timer = setTimeout(() => setFlashClass(""), 600);
      return () => clearTimeout(timer);
    }
  }, [value]);

  const colorClass =
    prevValue !== undefined && value !== prevValue
      ? value > prevValue
        ? "text-[var(--color-positive)]"
        : "text-[var(--color-negative)]"
      : "";

  return (
    <span className={`font-mono tabular-nums ${colorClass} ${flashClass} ${className}`}>
      {format(value)}
    </span>
  );
}

interface ChangeDisplayProps {
  change: number;
  changePct: number;
  className?: string;
}

export function ChangeDisplay({ change, changePct, className = "" }: ChangeDisplayProps) {
  const isUp = change >= 0;
  const color = isUp ? "text-[var(--color-positive)]" : "text-[var(--color-negative)]";
  const sign = isUp ? "+" : "";

  return (
    <span className={`font-mono tabular-nums ${color} ${className}`}>
      {sign}
      {(change / 100).toFixed(2)} ({sign}
      {changePct.toFixed(2)}%)
    </span>
  );
}

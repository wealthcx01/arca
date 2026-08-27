import type { ReactNode } from "react";

interface DataPanelProps {
  title: string;
  headerColor?: "primary" | "positive" | "negative" | "warning" | "default";
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}

const headerColorMap: Record<string, string> = {
  primary: "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
  positive: "bg-[var(--color-positive)] text-[var(--color-positive-foreground)]",
  negative: "bg-[var(--color-negative)] text-[var(--color-negative-foreground)]",
  warning: "bg-[var(--color-warning)] text-[var(--color-warning-foreground)]",
  default: "bg-[var(--color-muted)] text-[var(--color-foreground)]",
};

export function DataPanel({
  title,
  headerColor = "default",
  toolbar,
  children,
  className = "",
}: DataPanelProps) {
  return (
    <div
      className={`overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] ${className}`}
    >
      <div
        className={`flex items-center justify-between px-3 py-1.5 ${headerColorMap[headerColor]}`}
      >
        <h3 className="text-[10px] font-semibold uppercase tracking-wider">{title}</h3>
        {toolbar && <div className="flex items-center gap-1">{toolbar}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

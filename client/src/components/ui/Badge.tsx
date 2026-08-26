import { type VariantProps, cva } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const badgeVariants = cva("inline-flex items-center rounded font-semibold", {
  variants: {
    variant: {
      neutral:
        "border border-[var(--color-border)] text-[var(--color-muted-foreground)] bg-transparent",
      primary: "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
      positive: "bg-[var(--color-positive)] text-[var(--color-positive-foreground)]",
      negative: "bg-[var(--color-negative)] text-[var(--color-negative-foreground)]",
      warning: "bg-[var(--color-warning)] text-[var(--color-warning-foreground)]",
    },
    size: {
      sm: "px-1 py-0.5 text-[8px] tracking-wide",
      md: "px-1.5 py-0.5 text-[10px] tracking-wide",
    },
  },
  defaultVariants: {
    variant: "neutral",
    size: "md",
  },
});

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

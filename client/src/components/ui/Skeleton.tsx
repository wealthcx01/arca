import { cn } from "../../lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-[var(--color-muted)]", className)} />;
}

/** Dashboard loading skeleton: stat cards + chart + table */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-[var(--color-border)] p-4">
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="h-6 w-28" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-[var(--color-border)] p-4">
        <Skeleton className="h-48 w-full" />
      </div>
      <div className="rounded-lg border border-[var(--color-border)]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-3 border-b border-[var(--color-border)] px-4 py-3 last:border-0"
          >
            <Skeleton className="h-8 w-6 shrink-0 rounded" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="ml-auto h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Cards grid loading skeleton */
export function CardsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-[var(--color-border)]">
          <Skeleton className="aspect-[2.5/3.5] w-full" />
          <div className="p-2">
            <Skeleton className="mb-1 h-3 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Analytics page loading skeleton */
export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-[var(--color-border)] p-4">
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="mb-1 h-7 w-16" />
            <Skeleton className="h-2.5 w-14" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-[var(--color-border)] p-4">
            <Skeleton className="mb-3 h-4 w-32" />
            <Skeleton className="h-[250px] w-full" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-[var(--color-border)] p-4">
        <Skeleton className="mb-3 h-4 w-32" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    </div>
  );
}

/** Settings page loading skeleton */
export function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Skeleton className="h-8 w-24" />
      <div className="rounded-lg border border-[var(--color-border)]">
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <Skeleton className="mb-1 h-4 w-32" />
          <Skeleton className="h-3 w-64" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3 last:border-0"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded" />
              <div>
                <Skeleton className="mb-1 h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-2 w-2 rounded-full" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-[var(--color-border)] p-4">
        <Skeleton className="mb-3 h-4 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>
  );
}

/** Card detail page loading skeleton */
export function CardDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-24" />
      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <Skeleton className="aspect-[2.5/3.5] w-full rounded-lg" />
        <div className="space-y-4">
          <div>
            <Skeleton className="mb-2 h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-md border border-[var(--color-border)] p-3">
                <Skeleton className="mb-1 h-2.5 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-[var(--color-border)]">
            <div className="border-b border-[var(--color-border)] px-4 py-2">
              <Skeleton className="h-4 w-32" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-4 border-b border-[var(--color-border)] px-4 py-2.5 last:border-0"
              >
                <Skeleton className="h-4 w-16" />
                <Skeleton className="ml-auto h-4 w-14" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

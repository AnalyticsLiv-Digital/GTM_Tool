"use client";

// Tiny skeleton primitives. Animated background pulses while data loads —
// reduces the "is it broken or just slow?" feeling vs a "Loading…" string.

export function Skeleton({
  className = "",
  width,
  height,
}: {
  className?: string;
  width?: string;
  height?: string;
}) {
  return (
    <div
      className={`animate-pulse bg-card-hi rounded ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function EntityTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="bg-card rounded-2xl shadow-md border border-line overflow-hidden">
      <div className="bg-page-soft border-b border-line px-4 py-4 flex gap-4">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div role="status" aria-live="polite" aria-label="Loading">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="border-b border-line px-4 py-4 flex items-center gap-4"
          >
            <Skeleton className="h-4 w-4" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

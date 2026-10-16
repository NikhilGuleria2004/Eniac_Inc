import { Skeleton } from "./Skeleton";

/**
 * Page-level loading placeholder that mirrors the common page layout
 * (title, stat cards, content block) so nothing shifts when the real
 * content swaps in.
 */
export function PageSkeleton() {
  return (
    <div className="page-container space-y-6" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton variant="rectangular" className="h-24" />
        <Skeleton variant="rectangular" className="h-24" />
        <Skeleton variant="rectangular" className="h-24" />
        <Skeleton variant="rectangular" className="h-24" />
      </div>
      <Skeleton variant="rectangular" className="h-64" />
    </div>
  );
}

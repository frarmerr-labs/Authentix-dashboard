/**
 * Templates Loading Skeleton
 * 
 * Displayed instantly while templates are being fetched.
 * Uses lightweight skeleton UI for perceived performance.
 */

export default function TemplatesLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-56 bg-muted animate-pulse rounded" />
          <div className="h-4 w-72 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-9 w-52 bg-muted animate-pulse rounded" />
      </div>

      {/* Templates grid skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border bg-card overflow-hidden"
          >
            {/* Preview area */}
            <div className="aspect-[4/3] bg-muted animate-pulse" />
            
            {/* Content area */}
            <div className="p-4 space-y-3">
              {/* Title */}
              <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
              
              {/* Badges */}
              <div className="flex gap-1">
                <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
                <div className="h-5 w-20 bg-muted animate-pulse rounded-full" />
              </div>
              
              {/* Meta */}
              <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
              
              {/* Status */}
              <div className="h-5 w-14 bg-muted animate-pulse rounded-full" />
              
              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <div className="flex-1 h-9 bg-muted animate-pulse rounded" />
                <div className="h-9 w-9 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

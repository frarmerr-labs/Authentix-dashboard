import { Card, CardContent } from "@/components/ui/card";

export default function TemplatesLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-96 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-11 w-36 bg-muted animate-pulse rounded" />
      </div>

      {/* Grid skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="aspect-[4/3] bg-muted animate-pulse" />
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
                  <div className="h-5 w-20 bg-muted animate-pulse rounded-full" />
                </div>
                <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full flex-1 flex-col gap-6 p-4 sm:p-6">
      {/* Page Header */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>

            <Skeleton className="mt-5 h-8 w-16" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Main Sections */}
      <div className="grid flex-1 gap-6 lg:grid-cols-2">
        {/* Left */}
        <div className="rounded-xl border bg-card p-5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />

          <div className="mt-6 space-y-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-lg" />

                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48 max-w-full" />
                  <Skeleton className="h-2 w-full" />
                </div>

                <Skeleton className="h-4 w-10" />
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div className="rounded-xl border bg-card p-5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-56" />

          <div className="mt-6 space-y-6">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="size-9 rounded-lg" />

                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full max-w-sm" />
                  <Skeleton className="h-3 w-48 max-w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="rounded-xl border bg-card p-5">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="rounded-lg border p-4">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="mt-5 h-4 w-20" />
              <Skeleton className="mt-2 h-3 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

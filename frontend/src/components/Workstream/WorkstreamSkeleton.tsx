export function WorkstreamSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gray-200" />
            <div className="h-6 w-48 rounded bg-gray-200" />
          </div>
          <div className="mt-2">
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="mt-1 h-3 w-32 rounded bg-gray-200" />
          </div>
        </div>
        <div className="ml-4">
          <div className="h-8 w-20 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

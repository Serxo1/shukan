export function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border border-[#a8a29e]/20 border-t-[#a8a29e]/60 rounded-full animate-spin" />
        <span className="text-[#78716c]/40 text-xs tracking-wide">Loading...</span>
      </div>
    </div>
  );
}

export function TabLoadingFallback() {
  return (
    <div className="flex-1 flex flex-col p-8 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 w-48 bg-[rgba(168,162,158,0.08)] rounded-sm mb-6" />

      {/* Content skeleton */}
      <div className="space-y-4">
        <div className="h-12 bg-[rgba(168,162,158,0.05)] rounded-sm" />
        <div className="h-12 bg-[rgba(168,162,158,0.05)] rounded-sm" />
        <div className="h-12 bg-[rgba(168,162,158,0.05)] rounded-sm" />
      </div>
    </div>
  );
}

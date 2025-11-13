import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

export function SkeletonStatsCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton className="h-4 w-28 mb-3" />
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="ml-4">
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonFacilityCard() {
  return (
    <div className="group bg-white border rounded-xl overflow-hidden transition-all duration-300 flex flex-col h-full">
      <Skeleton className="w-full" style={{ aspectRatio: "16/9", minHeight: 180 }} />
      <div className="p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-5/6 mb-2" />
        <Skeleton className="h-3 w-3/4 mb-4" />
        <div className="mt-auto flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonListItem() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
      <div className="col-span-1 min-w-0 pr-24 md:pr-0">
        <div className="flex items-start gap-3">
          <Skeleton className="h-6 w-6 rounded" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-3 w-40 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
      <div className="col-span-1 min-w-0">
        <Skeleton className="h-3 w-32 mb-2" />
        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
      <div className="col-span-1 hidden md:block" />
      <div className="col-span-1 hidden md:flex items-start justify-end gap-3">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
    </div>
  );
}

export function SkeletonTableRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-3 p-3 bg-gray-50 rounded">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20 ml-auto" />
        </div>
      ))}
    </div>
  );
}

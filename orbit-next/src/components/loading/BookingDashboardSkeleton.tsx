import React from "react";
import { SkeletonFacilityCard, SkeletonListItem, SkeletonStatsCard } from "@/components/ui/skeleton-presets";

export default function BookingDashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <SkeletonStatsCard />
        <SkeletonStatsCard />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <div className="h-6 w-48 mb-2 skeleton rounded" />
            <div className="h-4 w-72 skeleton rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-16 skeleton rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonFacilityCard key={i} />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-5 w-40 skeleton rounded mb-2" />
            <div className="h-4 w-72 skeleton rounded" />
          </div>
          <div className="h-4 w-20 skeleton rounded" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

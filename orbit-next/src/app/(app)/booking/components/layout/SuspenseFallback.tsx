import React from 'react';
import { SkeletonFacilityCard, SkeletonListItem, SkeletonStatsCard } from "@/components/ui/skeleton-presets";

export function SuspenseFallback() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-16 bg-white border-b" />
      <div className="flex flex-1">
        <div className="hidden lg:block w-64 border-r" />
        <div className="flex-1 lg:ml-64 p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <SkeletonStatsCard />
            <SkeletonStatsCard />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <SkeletonFacilityCard />
            <SkeletonFacilityCard />
            <SkeletonFacilityCard />
            <SkeletonFacilityCard />
            <SkeletonFacilityCard />
            <SkeletonFacilityCard />
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
            <div className="h-6 w-48 mb-4 bg-gray-200 animate-pulse rounded" />
            <div className="space-y-3">
              <SkeletonListItem />
              <SkeletonListItem />
              <SkeletonListItem />
              <SkeletonListItem />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

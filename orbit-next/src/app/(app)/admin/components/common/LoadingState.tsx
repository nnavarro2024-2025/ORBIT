"use client";

import { SkeletonStatsCard, SkeletonTableRows } from "@/components/ui/skeleton-presets";

type Props = {
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (value: boolean) => void;
  sidebarItems: any[];
  selectedView: string;
  handleSidebarClick: (id: string) => void;
};

export function LoadingState({
  mobileSidebarOpen,
  setMobileSidebarOpen,
  sidebarItems,
  selectedView,
  handleSidebarClick,
}: Props) {
  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonStatsCard />
        <SkeletonStatsCard />
        <SkeletonStatsCard />
        <SkeletonStatsCard />
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <SkeletonTableRows rows={8} />
      </div>
    </div>
  );
}

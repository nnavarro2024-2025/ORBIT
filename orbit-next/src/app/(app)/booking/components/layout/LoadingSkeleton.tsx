import React from 'react';
import { Sidebar } from '@/components/layout';
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonFacilityCard, SkeletonListItem, SkeletonStatsCard } from "@/components/ui/skeleton-presets";

interface LoadingSkeletonProps {
  sidebarItems: any[];
  selectedView: string;
  handleSidebarClick: (id: string) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (value: boolean) => void;
}

export function LoadingSkeleton({
  sidebarItems,
  selectedView,
  handleSidebarClick,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,
}: LoadingSkeletonProps) {
  return (
    <div className="flex flex-1 relative">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 h-[calc(100vh-4rem)] border-r bg-card fixed top-16 left-0 z-30 overflow-y-auto">
        <Sidebar
          items={sidebarItems}
          activeItem={selectedView}
          onItemClick={handleSidebarClick}
        />
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-card border-r z-40 overflow-y-auto transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          items={sidebarItems}
          activeItem={selectedView}
          onItemClick={handleSidebarClick}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 ml-0">
        <div className="p-6 space-y-6">
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
            <Skeleton className="h-6 w-48 mb-4" />
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

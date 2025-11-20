"use client";

import { Header, Sidebar } from "@/components/layout";
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
    <div className="min-h-screen bg-background flex flex-col">
      <Header onMobileToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
      
      <div className="flex flex-1 relative">
        <div className="hidden lg:block w-64 h-[calc(100vh-4rem)] border-r bg-card fixed top-16 left-0 z-30 overflow-y-auto">
          <Sidebar
            items={sidebarItems}
            activeItem={selectedView}
            onItemClick={handleSidebarClick}
          />
        </div>

        <div
          className={`lg:hidden fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-card border-r z-40 overflow-y-auto transition-transform duration-300 ease-in-out ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar
            items={sidebarItems}
            activeItem={selectedView}
            onItemClick={handleSidebarClick}
          />
        </div>

        <div className="flex-1 lg:ml-64 ml-0 p-6 space-y-6">
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
      </div>
    </div>
  );
}

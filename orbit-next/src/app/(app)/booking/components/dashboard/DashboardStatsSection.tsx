import { CheckCircle, Clock } from "lucide-react";

import { SkeletonStatsCard } from "@/components/ui/skeleton-presets";

interface DashboardStatsSectionProps {
  stats: {
    active: number;
    upcoming: number;
  };
  isLoading: boolean;
  onSelectMyBookings: () => void;
}

export function DashboardStatsSection({ stats, isLoading, onSelectMyBookings }: DashboardStatsSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
      {isLoading ? (
        <>
          <SkeletonStatsCard />
          <SkeletonStatsCard />
        </>
      ) : (
        <>
          <button
            onClick={onSelectMyBookings}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-all duration-200 hover:border-pink-300 text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 group-hover:text-pink-700">Active Bookings</p>
                <p className="text-3xl font-bold text-pink-600 mt-1">{stats.active}</p>
                <p className="text-xs text-gray-500 mt-1">Currently in progress</p>
              </div>
              <div className="bg-pink-100 p-3 rounded-full group-hover:bg-pink-200 transition-colors duration-200">
                <CheckCircle className="h-6 w-6 text-pink-600" />
              </div>
            </div>
          </button>

          <button
            onClick={onSelectMyBookings}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-all duration-200 hover:border-pink-200 text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 group-hover:text-pink-700">Scheduled Bookings</p>
                <p className="text-3xl font-bold text-pink-600 mt-1">{stats.upcoming}</p>
                <p className="text-xs text-gray-500 mt-1">Approved and scheduled</p>
              </div>
              <div className="bg-pink-100 p-3 rounded-full group-hover:bg-pink-200 transition-colors duration-200">
                <Clock className="h-6 w-6 text-pink-600" />
              </div>
            </div>
          </button>
        </>
      )}
    </div>
  );
}

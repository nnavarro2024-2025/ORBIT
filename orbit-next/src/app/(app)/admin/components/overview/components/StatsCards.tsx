import React from "react";
import { CheckCircle, Clock, TriangleAlert } from "lucide-react";
import type { StatsCardsProps } from "../../admin/types";

interface OverviewTileProps {
  title: string;
  count: number | string;
  subtitle?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

const OverviewTile = ({ title, count, subtitle, onClick, icon }: OverviewTileProps) => (
  <button onClick={onClick} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-all duration-200 text-left group w-full">
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-gray-600 group-hover:text-gray-800 break-words">{title}</p>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{count}</p>
        {subtitle && <p className="text-[10px] sm:text-xs text-gray-500 mt-1 break-words">{subtitle}</p>}
      </div>
      <div className="bg-gray-100 p-2 sm:p-3 rounded-full group-hover:bg-gray-200 transition-colors duration-200 flex-shrink-0 ml-2 sm:ml-0">
        {icon}
      </div>
    </div>
  </button>
);

export function StatsCards({ activeBookings, upcomingBookings, userManagementAlerts, onNavigateToBookingManagement, onNavigateToSecurity }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
      <OverviewTile
        title="Active Bookings"
        count={activeBookings?.length || 0}
        subtitle="Currently in progress"
        onClick={() => onNavigateToBookingManagement('active')}
        icon={<CheckCircle className="h-6 w-6 text-green-600" />}
      />

      <OverviewTile
        title="Scheduled Bookings"
        count={upcomingBookings?.length || 0}
        subtitle="Auto-scheduled reservations"
        onClick={() => onNavigateToBookingManagement('pendingList')}
        icon={<Clock className="h-6 w-6 text-green-600" />}
      />

      <OverviewTile
        title="System Alerts"
        count={userManagementAlerts.length}
        subtitle="Requiring attention"
        onClick={onNavigateToSecurity}
        icon={<TriangleAlert className="h-6 w-6 text-orange-600" />}
      />
    </div>
  );
}

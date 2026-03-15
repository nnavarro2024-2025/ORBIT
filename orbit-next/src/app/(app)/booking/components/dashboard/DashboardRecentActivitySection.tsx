import { Dispatch, SetStateAction, useState, useMemo } from "react";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { isAfter, isBefore, isToday } from "date-fns";

import { SkeletonListItem } from "@/components/ui/skeleton-presets";
import { Badge } from "@/components/ui/badge";

interface DashboardRecentActivitySectionProps {
  activityTab: "booking" | "notifications";
  onChangeTab: (tab: "booking" | "notifications") => void;
  userBookings: any[];
  notificationsData: any[];
  isUserBookingsLoading: boolean;
  isUserBookingsFetching: boolean;
  isNotificationsLoading: boolean;
  isNotificationsFetching: boolean;
  itemsPerPage: number;
  openOthers: Record<string, boolean>;
  setOpenOthers: Dispatch<SetStateAction<Record<string, boolean>>>;
  getBookingStatus: (booking: any) => { label: string; badgeClass: string };
  getFacilityDisplay: (facilityId: number) => string;
  parseEquipmentFromMessage: (message: string) => { baseMessage: string; equipment: any };
  getEquipmentStatusColor: (status: string) => string;
  onSelectViewAllBookingHistory: () => void;
  onNavigateToBookingDetails: (bookingId: string) => void;
  onMarkNotificationRead: (notificationId: string) => void;
  markNotificationReadPending: boolean;
}

// Helper function to check if equipment was returned
function isEquipmentReturned(equipment: any): boolean {
  // Check if there's a return status in equipment data
  return equipment?.returnedAt ? true : false;
}

// Helper function to categorize bookings
function categorizeBooking(booking: any): "recent" | "history" | "ongoing" {
  const now = new Date();
  const startTime = new Date(booking.startTime);
  const endTime = new Date(booking.endTime);

  // Check if booking is happening right now
  if (isBefore(startTime, now) && isAfter(endTime, now)) {
    return "ongoing";
  }

  // Check if booking is in the future
  if (isAfter(startTime, now)) {
    return "recent";
  }

  // Otherwise it's in the past
  return "history";
}

export function DashboardRecentActivitySection({
  activityTab,
  onChangeTab,
  userBookings,
  notificationsData,
  isUserBookingsLoading,
  isUserBookingsFetching,
  isNotificationsLoading,
  isNotificationsFetching,
  itemsPerPage,
  openOthers,
  setOpenOthers,
  getBookingStatus,
  getFacilityDisplay,
  parseEquipmentFromMessage,
  getEquipmentStatusColor,
  onSelectViewAllBookingHistory,
  onNavigateToBookingDetails,
  onMarkNotificationRead,
  markNotificationReadPending,
}: DashboardRecentActivitySectionProps) {
  const [bookingFilter, setBookingFilter] = useState<"recent" | "history" | "ongoing">("recent");

  // Categorize and filter bookings
  const categorizedBookings = useMemo(() => {
    return userBookings
      .filter((booking) => booking.status === "approved") // Only approved bookings
      .map((booking) => ({
        ...booking,
        category: categorizeBooking(booking),
      }));
  }, [userBookings]);

  const filteredBookings = useMemo(() => {
    return categorizedBookings.filter((booking) => booking.category === bookingFilter);
  }, [categorizedBookings, bookingFilter]);

  const renderBookingCard = (booking: any) => {
    const equipment = booking.equipment || {};
    const items = Array.isArray(equipment.items) ? equipment.items : [];

    return (
      <div key={booking.id} className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 hover:border-pink-200 hover:shadow-sm transition-all duration-200">
        {/* Header with facility and time */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="bg-pink-100 p-2 rounded-lg flex-shrink-0">
                <Calendar className="h-4 w-4 text-pink-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 text-sm leading-tight">{getFacilityDisplay(booking.facilityId)}</h4>
                <p className="text-xs text-gray-600 mt-0.5">
                  {format(new Date(booking.startTime), "eee, MMM d, yyyy")} • {format(new Date(booking.startTime), "h:mm a")} to {format(new Date(booking.endTime), "h:mm a")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Equipment section */}
        {items.length > 0 && (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-3 space-y-2">
            <h5 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Equipment</h5>
            <div className="space-y-1.5">
              {items.map((item: string, idx: number) => {
                const isReturned = isEquipmentReturned(booking);
                
                return (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-800">{item}</span>
                    <Badge className={`text-xs font-semibold border-0 ${
                      isReturned
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {isReturned ? "Returned" : "Not Returned"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBookingList = () => {
    if (isUserBookingsLoading || isUserBookingsFetching) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonListItem key={`booking-skeleton-${index}`} />
          ))}
        </div>
      );
    }

    if (filteredBookings.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600 text-sm">No {bookingFilter} bookings</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {filteredBookings.slice(0, itemsPerPage).map((booking) => renderBookingCard(booking))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Recent Bookings & Equipment</h3>
          <p className="text-sm text-gray-600 mt-1">View your booked facilities and equipment status</p>
        </div>

        {/* Toggle Buttons */}
        <div className="flex items-center gap-2 w-full">
          <button
            onClick={() => setBookingFilter("ongoing")}
            className={`flex-1 sm:flex-none px-3 py-2 rounded whitespace-nowrap text-sm transition-colors ${
              bookingFilter === "ongoing"
                ? "bg-pink-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            On Going
          </button>
          <button
            onClick={() => setBookingFilter("recent")}
            className={`flex-1 sm:flex-none px-3 py-2 rounded whitespace-nowrap text-sm transition-colors ${
              bookingFilter === "recent"
                ? "bg-pink-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setBookingFilter("history")}
            className={`flex-1 sm:flex-none px-3 py-2 rounded whitespace-nowrap text-sm transition-colors ${
              bookingFilter === "history"
                ? "bg-pink-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {renderBookingList()}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-gray-100 mt-4 flex items-center justify-between">
        <p className="text-[11px] sm:text-sm text-gray-600">
          {filteredBookings.length} {bookingFilter} booking{filteredBookings.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={onSelectViewAllBookingHistory}
          className="text-sm text-pink-600 hover:text-pink-700 font-medium transition-colors"
        >
          View All →
        </button>
      </div>
    </div>
  );
}

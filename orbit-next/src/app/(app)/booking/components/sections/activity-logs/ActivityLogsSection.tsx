import { Dispatch, SetStateAction, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { BookingHistoryTab } from "./BookingHistoryTab";
import { NotificationsTab } from "./NotificationsTab";

interface ActivityLogsSectionProps {
  activityTab: "booking" | "notifications";
  onActivityTabChange: (tab: "booking" | "notifications") => void;
  activitySearchTerm: string;
  onSearchTermChange: (value: string) => void;
  activityBookingPage: number;
  setActivityBookingPage: Dispatch<SetStateAction<number>>;
  activityNotificationsPage: number;
  setActivityNotificationsPage: Dispatch<SetStateAction<number>>;
  bookingsPerPage: number;
  notificationsPerPage: number;
  userBookings: any[];
  notificationsData: any[];
  isUserBookingsLoading: boolean;
  isUserBookingsFetching: boolean;
  isNotificationsLoading: boolean;
  isNotificationsFetching: boolean;
  openOthers: Record<string, boolean>;
  setOpenOthers: Dispatch<SetStateAction<Record<string, boolean>>>;
  getBookingStatus: (booking: any) => { label: string; badgeClass: string };
  getFacilityDisplay: (facilityId: number) => string;
  parseEquipmentFromMessage: (message: string) => { baseMessage: string; equipment: any };
  getEquipmentStatusColor: (status: string) => string;
  onNavigateToBookingDetails: (bookingId: string) => void;
  onMarkNotificationRead: (notificationId: string) => Promise<void>;
  markNotificationReadPending: boolean;
}

export function ActivityLogsSection({
  activityTab,
  onActivityTabChange,
  activitySearchTerm,
  onSearchTermChange,
  activityBookingPage,
  setActivityBookingPage,
  activityNotificationsPage,
  setActivityNotificationsPage,
  bookingsPerPage,
  notificationsPerPage,
  userBookings,
  notificationsData,
  isUserBookingsLoading,
  isUserBookingsFetching,
  isNotificationsLoading,
  isNotificationsFetching,
  openOthers,
  setOpenOthers,
  getBookingStatus,
  getFacilityDisplay,
  parseEquipmentFromMessage,
  getEquipmentStatusColor,
  onNavigateToBookingDetails,
  onMarkNotificationRead,
  markNotificationReadPending,
}: ActivityLogsSectionProps) {
  const searchTerm = activitySearchTerm;

  // Filter bookings for count
  const filteredUserBookings = useMemo(() => {
    if (!searchTerm) return userBookings;
    const lowerSearch = searchTerm.toLowerCase();
    return userBookings.filter((booking: any) => {
      const facilityDisplay = getFacilityDisplay(booking.facilityId).toLowerCase();
      const purpose = String(booking.purpose || "").toLowerCase();
      const status = String(booking.status || "").toLowerCase();
      const participants = String(booking.participants || "");
      return (
        facilityDisplay.includes(lowerSearch) ||
        purpose.includes(lowerSearch) ||
        status.includes(lowerSearch) ||
        participants.includes(lowerSearch)
      );
    });
  }, [userBookings, searchTerm, getFacilityDisplay]);

  // Filter notifications for count
  const filteredNotifications = useMemo(() => {
    if (!searchTerm) return notificationsData;
    const lowerSearch = searchTerm.toLowerCase();
    return notificationsData.filter((notification: any) => {
      const title = String(notification.title || "").toLowerCase();
      const message = String(notification.message || "").toLowerCase();
      const type = String(notification.type || "").toLowerCase();
      return title.includes(lowerSearch) || message.includes(lowerSearch) || type.includes(lowerSearch);
    });
  }, [notificationsData, searchTerm]);

  // Auto-switch tabs if one has no results
  useEffect(() => {
    if (!searchTerm) return;
    const bookingCount = filteredUserBookings.length;
    const notifCount = filteredNotifications.length;
    if (activityTab === "booking" && bookingCount === 0 && notifCount > 0) {
      onActivityTabChange("notifications");
    } else if (activityTab === "notifications" && notifCount === 0 && bookingCount > 0) {
      onActivityTabChange("booking");
    }
  }, [activityTab, filteredNotifications.length, filteredUserBookings.length, onActivityTabChange, searchTerm]);

  const handleTabChange = (tab: "booking" | "notifications") => {
    if (tab === activityTab) return;
    onActivityTabChange(tab);
    if (tab === "booking") {
      setActivityBookingPage(0);
    } else {
      setActivityNotificationsPage(0);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Activity Logs</h3>
            <p className="text-sm text-gray-600 mt-1">View booking history and notification logs</p>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => handleTabChange("booking")}
              className={`px-3 py-2 rounded whitespace-nowrap text-sm ${activityTab === "booking" ? "bg-pink-600 text-white" : "bg-gray-100 text-gray-700"}`}
            >
              Booking History
            </button>
            <button
              onClick={() => handleTabChange("notifications")}
              className={`px-3 py-2 rounded whitespace-nowrap text-sm ${activityTab === "notifications" ? "bg-pink-600 text-white" : "bg-gray-100 text-gray-700"}`}
            >
              Notification Logs
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={activitySearchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            placeholder="Search bookings and notifications..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:border-pink-600 focus:ring-1 focus:ring-pink-600 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activityTab === "booking" ? (
          <BookingHistoryTab
            userBookings={filteredUserBookings}
            isUserBookingsLoading={isUserBookingsLoading}
            isUserBookingsFetching={isUserBookingsFetching}
            searchTerm={searchTerm}
            activityBookingPage={activityBookingPage}
            setActivityBookingPage={setActivityBookingPage}
            bookingsPerPage={bookingsPerPage}
            openOthers={openOthers}
            setOpenOthers={setOpenOthers}
            getBookingStatus={getBookingStatus}
            getFacilityDisplay={getFacilityDisplay}
            onNavigateToBookingDetails={onNavigateToBookingDetails}
          />
        ) : (
          <NotificationsTab
            notificationsData={filteredNotifications}
            isNotificationsLoading={isNotificationsLoading}
            isNotificationsFetching={isNotificationsFetching}
            searchTerm={searchTerm}
            activityNotificationsPage={activityNotificationsPage}
            setActivityNotificationsPage={setActivityNotificationsPage}
            notificationsPerPage={notificationsPerPage}
            parseEquipmentFromMessage={parseEquipmentFromMessage}
            getEquipmentStatusColor={getEquipmentStatusColor}
            onMarkNotificationRead={onMarkNotificationRead}
            markNotificationReadPending={markNotificationReadPending}
          />
        )}
      </div>

      {/* Pagination Footer */}
      <div className="pt-4 border-t border-gray-100 mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {activityTab === "booking" ? (
          <p className="text-[11px] sm:text-sm text-gray-600">
            {searchTerm
              ? `${filteredUserBookings.length}/${userBookings.length} bookings`
              : `Showing ${Math.min(bookingsPerPage, filteredUserBookings.length)} of ${filteredUserBookings.length} bookings`}
          </p>
        ) : (
          <p className="text-[11px] sm:text-sm text-gray-600">
            {searchTerm
              ? `${filteredNotifications.length}/${notificationsData.length} notifications`
              : `Showing ${
                  filteredNotifications.length === 0
                    ? 0
                    : activityNotificationsPage * notificationsPerPage + 1
                } to ${Math.min(
                  (activityNotificationsPage + 1) * notificationsPerPage,
                  filteredNotifications.length
                )} of ${filteredNotifications.length} notifications`}
          </p>
        )}

        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
          {activityTab === "booking" ? null : (
            <>
              <button
                onClick={() => setActivityNotificationsPage((prev) => Math.max(0, prev - 1))}
                disabled={activityNotificationsPage === 0}
                className="flex-1 sm:flex-none px-3 py-1.5 sm:py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() =>
                  setActivityNotificationsPage((prev) =>
                    (prev + 1) * notificationsPerPage < filteredNotifications.length ? prev + 1 : prev
                  )
                }
                disabled={(activityNotificationsPage + 1) * notificationsPerPage >= filteredNotifications.length}
                className="flex-1 sm:flex-none px-3 py-1.5 sm:py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium transition-colors"
              >
                Next
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

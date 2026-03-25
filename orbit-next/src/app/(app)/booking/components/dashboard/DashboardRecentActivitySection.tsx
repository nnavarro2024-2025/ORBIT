import { Dispatch, SetStateAction, useMemo } from "react";
import { Calendar, Loader2 } from "lucide-react";
import { format, isToday } from "date-fns";

import { SkeletonListItem } from "@/components/ui/skeleton-presets";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DashboardRecentActivitySectionProps {
  activityTab: "booking" | "notifications";
  onChangeTab: (tab: "booking" | "notifications") => void;
  currentUserEmail?: string;
  currentUserName?: string;
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

export function DashboardRecentActivitySection({
  activityTab,
  onChangeTab,
  currentUserEmail,
  currentUserName,
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
  // Filter: ALL Scheduled/Active/Pending bookings + only TODAY's Completed/Cancelled
  const filteredBookings = useMemo(() => {
    return userBookings.filter((booking) => {
      const status = getBookingStatus(booking);
      if (["Active", "Scheduled", "Pending"].includes(status.label)) return true;
      if (status.label === "Completed" || status.label === "Cancelled") {
        return isToday(new Date(booking.endTime));
      }
      return false;
    });
  }, [userBookings, getBookingStatus]);

  const renderBookingList = () => {
    if (isUserBookingsLoading || isUserBookingsFetching) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonListItem key={`booking-skeleton-${index}`} />
          ))}
        </div>
      );
    }

    if (filteredBookings.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600 text-sm">No booking history</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filteredBookings.map((booking) => {
          const id = String(booking.id || Math.random());
          const equipment = booking.equipment || {};
          const items = Array.isArray(equipment.items) ? equipment.items : [];
          const hasOthers = equipment.others && String(equipment.others).trim().length > 0;
          const status = getBookingStatus(booking);

          return (
            <div
              key={booking.id}
              className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 hover:border-pink-200 hover:shadow-sm transition-all duration-200 cursor-pointer overflow-hidden"
              onClick={() => onNavigateToBookingDetails(String(booking.id))}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
                {/* Left section: Facility info */}
                <div className="flex-shrink-0">
                  <div className="flex items-start gap-2">
                    <div className={`${
                      status.label === "Active" ? "bg-green-100" : 
                      status.label === "Scheduled" ? "bg-pink-100" : 
                      "bg-gray-100"
                    } p-2 rounded-lg flex-shrink-0`}>
                      <Calendar className={`h-4 w-4 ${
                        status.label === "Active" ? "text-green-600" : 
                        status.label === "Scheduled" ? "text-pink-600" : 
                        "text-gray-600"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 text-sm leading-tight break-words">{getFacilityDisplay(booking.facilityId)}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">Participants:</span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{booking.participants || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Right section: Time, Status, Equipment */}
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-6">
                  {/* Time and Status Row on Mobile */}
                  <div className="flex items-center justify-between lg:justify-start gap-3 lg:gap-6">
                    {/* Time Info */}
                    <div className="flex items-center gap-6">
                      <div className="text-left">
                        <p className="text-xs font-medium text-gray-500 mb-1">Started</p>
                        <p className="text-lg font-semibold text-gray-900 whitespace-nowrap">{format(new Date(booking.startTime), "h:mm a")}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{format(new Date(booking.startTime), "M/d/yyyy")}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-medium text-gray-500 mb-1">Ends</p>
                        <p className="text-lg font-semibold text-gray-900 whitespace-nowrap">{format(new Date(booking.endTime), "h:mm a")}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{format(new Date(booking.endTime), "M/d/yyyy")}</p>
                      </div>
                    </div>
                    {/* Status */}
                    <div className="flex flex-col gap-2.5">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        status.label === "Active" ? "bg-green-100 text-green-800" :
                        status.label === "Scheduled" ? "bg-pink-100 text-pink-800" :
                        status.label === "Completed" ? "bg-green-100 text-green-800" :
                        status.label === "Cancelled" ? "bg-orange-100 text-orange-800" :
                        status.label === "Denied" ? "bg-red-100 text-red-800" :
                        status.label === "Pending" ? "bg-blue-100 text-blue-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                  {/* Equipment */}
                  {(items.length > 0 || hasOthers) && (
                    <div className="w-full lg:w-auto lg:max-w-[280px]">
                      <div className="mb-1.5">
                        <h5 className="text-[13px] font-bold text-gray-700 tracking-wider text-left">Booked Equipment</h5>
                      </div>
                      <div className="space-y-0.5 text-left">
                        {items.map((item: string, idx: number) => (
                          <div key={`eq-status-${id}-${idx}`} className="py-0.5">
                            <span className="text-xs text-gray-700 font-medium">{item}</span>
                          </div>
                        ))}
                          {hasOthers && (
                            <div className="py-0.5">
                              <Popover open={!!openOthers[id]} onOpenChange={(value) => setOpenOthers((prev) => ({ ...prev, [id]: value }))}>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <PopoverTrigger asChild>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                          }}
                                          className="text-xs text-pink-600 hover:text-pink-700 font-medium transition-colors"
                                        >
                                          View other
                                        </button>
                                      </PopoverTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                        <p className="font-semibold text-sm text-gray-800">Other equipment</p>
                                      </div>
                                      <div className="p-3">
                                        <p className="text-sm text-gray-900 leading-5 break-words">{String(equipment.others).trim()}</p>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <PopoverContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50">
                                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                    <p className="font-semibold text-sm text-gray-800">Other equipment</p>
                                  </div>
                                  <div className="p-3 max-h-48 overflow-y-auto">
                                    <p className="text-sm text-gray-900 leading-5 break-words">{String(equipment.others).trim()}</p>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderNotificationList = () => {
    if (isNotificationsLoading || isNotificationsFetching) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonListItem key={`notification-skeleton-${index}`} />
          ))}
        </div>
      );
    }

    if (notificationsData.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600 text-sm">No notifications yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {notificationsData.slice(0, itemsPerPage).map((notification: any) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg border ${
              notification.readAt ? "border-gray-100 bg-gray-50" : "border-pink-100 bg-pink-50"
            } flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium ${
                    notification.type === "BOOKING_APPROVED"
                      ? "bg-green-100 text-green-800"
                      : notification.type === "BOOKING_DENIED"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {notification.type?.replace(/_/g, " ") || "Notification"}
                </span>
                {!notification.readAt && (
                  <span className="text-[10px] text-pink-600 font-medium uppercase tracking-wide">
                    New
                  </span>
                )}
              </div>
              <h4 className="text-sm font-semibold text-gray-900 truncate">
                {notification.title || "Notification"}
              </h4>
              <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap break-words">
                {(notification.message || "").split("\n").map((line: string, idx: number) => (
                  <span key={idx} className="block">
                    {(() => {
                      const { baseMessage, equipment } = parseEquipmentFromMessage(line);
                      const equipmentItems = equipment && typeof equipment === "object"
                        ? Array.isArray(equipment.items)
                          ? equipment.items
                          : Object.keys(equipment).filter((key) => key !== "others")
                        : [];
                      return (
                        <>
                          {baseMessage}
                          {equipmentItems.length > 0 ? (
                            <div className="mt-2">
                              <span className="block text-[11px] font-semibold text-gray-700">
                                Equipment requested:
                              </span>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {equipmentItems.map((itemKey: string) => (
                                  <span
                                    key={itemKey}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-blue-50 text-blue-700 border-blue-200"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                    {itemKey.replace(/_/g, " ")}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {equipment && equipment.others ? (
                            <div className="mt-2">
                              <span className="block text-[11px] font-semibold text-gray-700">
                                Other notes:
                              </span>
                              <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap break-words">
                                {String(equipment.others)}
                              </p>
                            </div>
                          ) : null}
                        </>
                      );
                    })()}
                  </span>
                ))}
              </p>
              <p className="text-[11px] text-gray-500 mt-2">
                {format(new Date(notification.createdAt), "EEE, MMM d • hh:mm a")}
              </p>
            </div>
            {/* No Mark Read button — pink highlight indicates new */}
          </div>
        ))}
      </div>
    );
  };

  const bookingsShown = filteredBookings.length;
  const notificationsShown = Math.min(itemsPerPage, notificationsData.length);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">My Scheduled Facility Logs</h3>
            <p className="text-sm text-gray-600 mt-1">Your latest facility reservations and notifications</p>
          </div>
          <button
            onClick={() => {
              if (activityTab === "booking") {
                onSelectViewAllBookingHistory();
              } else {
                try {
                  window.location.hash = "#activity-logs:notifications";
                  window.dispatchEvent(new HashChangeEvent('hashchange'));
                } catch (e) {
                  onSelectViewAllBookingHistory();
                }
              }
            }}
            className="text-pink-600 hover:text-pink-800 font-medium text-sm transition-colors duration-200 self-start sm:self-auto"
          >
            View All →
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => onChangeTab("booking")}
            className={`flex-1 sm:flex-none px-3 py-2 rounded whitespace-nowrap text-sm transition-colors ${activityTab === "booking" ? "bg-pink-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            Booking Logs
          </button>
          <button
            onClick={() => onChangeTab("notifications")}
            className={`flex-1 sm:flex-none px-3 py-2 rounded whitespace-nowrap text-sm transition-colors ${activityTab === "notifications" ? "bg-pink-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            Notifications
          </button>
        </div>
      </div>

      {activityTab === "booking" ? renderBookingList() : renderNotificationList()}

      <div className="pt-4 border-t border-gray-100 mt-6 flex items-center justify-between text-sm text-gray-600">
        {activityTab === "booking" ? (
          <p>Showing {bookingsShown} of {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}</p>
        ) : (
          <p>Showing {notificationsShown} of {notificationsData.length} notification{notificationsData.length !== 1 ? 's' : ''}</p>
        )}
      </div>
    </div>
  );
}

import { Dispatch, SetStateAction } from "react";
import { Calendar, Eye, Loader2 } from "lucide-react";

import { SkeletonListItem } from "@/components/ui/skeleton-presets";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

const STATUS_BADGE_CLASSES: Record<string, string> = {
  Active: "bg-pink-100 text-pink-800",
  Scheduled: "bg-yellow-50 text-yellow-800",
  Done: "bg-gray-100 text-gray-800",
  Denied: "bg-red-100 text-red-800",
};

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

    if (userBookings.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600 text-sm">No booking history</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {userBookings.slice(0, 5).map((booking) => {
          const id = String(booking.id || Math.random());
          const equipment = booking.equipment || {};
          const items = Array.isArray(equipment.items) ? equipment.items : [];
          const hasOthers = equipment.others && String(equipment.others).trim().length > 0;
          const status = getBookingStatus(booking);

          return (
            <div
              key={booking.id}
              className="relative grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 items-start"
            >
              <div className="absolute top-3 right-3 md:hidden flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_BADGE_CLASSES[status.label] || "bg-gray-100 text-gray-800"}`}>
                  {status.label}
                </span>
                <button
                  onClick={() => onNavigateToBookingDetails(String(booking.id))}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>

              <div className="col-span-1 min-w-0 pr-24 md:pr-0">
                <div className="flex items-start gap-3">
                  <div className="bg-white p-1.5 rounded-lg shadow-sm flex-shrink-0">
                    <Calendar className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm truncate">{getFacilityDisplay(booking.facilityId)}</h4>
                    <p className="text-xs text-gray-600 truncate">
                      {new Date(booking.startTime).toLocaleString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </p>
                    {booking.participants && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
                          <svg className="h-3 w-3 text-gray-600" viewBox="0 0 8 8" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="4" cy="4" r="4" />
                          </svg>
                          <span>{booking.participants}</span>
                          <span className="text-[10px]">participant{booking.participants > 1 ? "s" : ""}</span>
                        </span>
                      </div>
                    )}
                    <div className="text-[11px] text-gray-800 mt-2">
                      {(booking.purpose || "").length > 30 ? (
                        <TooltipProvider>
                          <Tooltip>
                            <Popover>
                              <TooltipTrigger asChild>
                                <PopoverTrigger asChild>
                                  <button className="flex items-center gap-1 text-[11px] text-gray-700" aria-expanded={false}>
                                    <Eye className="h-3 w-3 text-pink-600" />
                                    <span className="text-gray-700">View purpose</span>
                                  </button>
                                </PopoverTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                  <p className="font-medium text-sm text-gray-800">Full Purpose</p>
                                </div>
                                <div className="p-4 max-h-48 overflow-y-auto">
                                  <p className="whitespace-pre-wrap text-sm text-gray-900 leading-6 break-words font-normal">{booking.purpose}</p>
                                </div>
                              </TooltipContent>
                              <PopoverContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50 origin-top-left">
                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                  <p className="font-medium text-sm text-gray-800">Full Purpose</p>
                                </div>
                                <div className="p-3">
                                  <p className="text-sm text-gray-900 leading-5 break-words font-normal">{booking.purpose || "No purpose specified"}</p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <p className="text-[11px] text-gray-800">
                          <span className="font-medium">Purpose:&nbsp;</span>
                          <span className="font-normal">{booking.purpose || "No purpose specified"}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-1 min-w-0">
                <div className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <span>Equipment or Needs</span>
                  {hasOthers && (
                    <TooltipProvider>
                      <Tooltip>
                        <Popover open={!!openOthers[id]} onOpenChange={(value) => setOpenOthers((previous) => ({ ...previous, [id]: value }))}>
                          <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                              <div className="flex items-center gap-2 cursor-help">
                                <Eye className="h-3 w-3 text-pink-600 flex-shrink-0" />
                                <p className="text-[11px] text-gray-800 font-medium">View other</p>
                              </div>
                            </PopoverTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                              <p className="font-semibold text-sm text-gray-800">Other equipment</p>
                            </div>
                            <div className="p-3">
                              <p className="whitespace-pre-wrap text-sm text-gray-900 leading-6 break-words font-normal">{String(equipment.others).trim()}</p>
                            </div>
                          </TooltipContent>
                          <PopoverContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50 origin-top-left">
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                              <p className="font-semibold text-sm text-gray-800">Other equipment</p>
                            </div>
                            <div className="p-3">
                              <p className="text-sm text-gray-900 break-words whitespace-pre-wrap font-normal">{String(equipment.others).trim()}</p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap mt-2">
                  {items.map((item: string, index: number) => (
                    <span key={`dashboard-activity-equipment-${id}-${index}`} className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full border border-gray-200">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="col-span-1 hidden md:block" />

              <div className="col-span-1 hidden md:flex items-start justify-end">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_BADGE_CLASSES[status.label] || "bg-gray-100 text-gray-800"}`}>
                    {status.label}
                  </span>
                  <button
                    onClick={() => onNavigateToBookingDetails(String(booking.id))}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
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
          <p className="text-gray-600 text-sm">No notifications</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {notificationsData.slice(0, itemsPerPage).map((notification: any) => {
          const { baseMessage, equipment } = parseEquipmentFromMessage(notification.message);

          return (
            <div key={notification.id} className={`p-3 sm:p-4 rounded-md bg-white border ${notification.isRead ? "opacity-70" : ""}`}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900">{notification.title}</div>
                  <div className="text-xs text-gray-600 mt-1 break-words">{baseMessage}</div>
                  {equipment && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Array.isArray(equipment)
                        ? (equipment as any[]).map((label, index) => (
                            <span key={`notif-eq-${notification.id}-${index}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {String(label)}
                            </span>
                          ))
                        : Object.entries(equipment).map(([key, value]: [string, any]) => {
                            const displayKey = key
                              .split("_")
                              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                              .join(" ");
                            return (
                              <span
                                key={key}
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getEquipmentStatusColor(String(value))}`}
                              >
                                {displayKey}
                              </span>
                            );
                          })}
                    </div>
                  )}
                </div>
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:ml-4 shrink-0">
                  <div className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">
                    {new Date(notification.createdAt).toLocaleString()}
                  </div>
                  {!notification.isRead && (
                    <button
                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-wait flex items-center gap-1 whitespace-nowrap"
                      onClick={() => onMarkNotificationRead(notification.id)}
                      disabled={markNotificationReadPending}
                    >
                      {markNotificationReadPending ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="hidden sm:inline">Reading...</span>
                        </>
                      ) : (
                        "Mark Read"
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const bookingsShown = Math.min(itemsPerPage, userBookings.length);
  const notificationsShown = Math.min(itemsPerPage, notificationsData.length);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Recent Booking</h3>
          <p className="text-gray-600 text-sm mt-1">Your latest facility reservations</p>
        </div>
        <button
          onClick={onSelectViewAllBookingHistory}
          className="text-pink-600 hover:text-pink-800 font-medium text-sm transition-colors duration-200"
        >
          View All →
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => onChangeTab("booking")}
          className={`px-3 py-1 rounded ${activityTab === "booking" ? "bg-pink-600 text-white" : "bg-gray-100 text-gray-700"}`}
        >
          Booking History
        </button>
        <button
          onClick={() => onChangeTab("notifications")}
          className={`px-3 py-1 rounded ${activityTab === "notifications" ? "bg-pink-600 text-white" : "bg-gray-100 text-gray-700"}`}
        >
          Notification Logs
        </button>
      </div>

      {activityTab === "booking" ? renderBookingList() : renderNotificationList()}

      <div className="pt-4 border-t border-gray-100 mt-4 flex items-center justify-between">
        {activityTab === "booking" ? (
          <p className="text-sm text-gray-600">Showing {bookingsShown} of {userBookings.length} bookings</p>
        ) : (
          <p className="text-sm text-gray-600">Showing {notificationsShown} of {notificationsData.length} notifications</p>
        )}
        <div className="flex items-center gap-2" />
      </div>
    </div>
  );
}

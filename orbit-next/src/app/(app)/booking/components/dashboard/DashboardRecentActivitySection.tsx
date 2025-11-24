import { Dispatch, SetStateAction } from "react";
import { Calendar, Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";

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
  Completed: "bg-gray-100 text-gray-800",
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
              className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 hover:border-pink-200 hover:shadow-sm transition-all duration-200 cursor-pointer"
              onClick={() => onNavigateToBookingDetails(String(booking.id))}
            >
              <div className="flex items-center justify-between gap-4">
                {/* Left section: User info */}
                <div className="flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={`${
                      status.label === "Active" ? "bg-green-100" : 
                      status.label === "Scheduled" ? "bg-pink-100" : 
                      "bg-gray-100"
                    } p-2 rounded-lg`}>
                      <Calendar className={`h-4 w-4 ${
                        status.label === "Active" ? "text-green-600" : 
                        status.label === "Scheduled" ? "text-pink-600" : 
                        "text-gray-600"
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm leading-tight">{getFacilityDisplay(booking.facilityId)}</h4>
                      {booking.courseYearDept && (
                        <p className="text-xs text-gray-500 mt-0.5 leading-tight">
                          <span className="font-medium">Course/Year/Dept:</span> <span className="text-blue-700 font-semibold">{booking.courseYearDept}</span>
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {booking.userEmail && (
                          <>
                            <span className="text-xs text-gray-500">User:</span>
                            <span className="text-xs font-semibold text-blue-700">{booking.userEmail}</span>
                            <span className="text-gray-300">•</span>
                          </>
                        )}
                        <span className="text-xs text-gray-500">Participants:</span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{booking.participants || 0}</span>
                        {booking.purpose && (
                          <>
                            <span className="text-gray-300">•</span>
                            <TooltipProvider>
                              <Tooltip>
                                <Popover>
                                  <TooltipTrigger asChild>
                                    <PopoverTrigger asChild>
                                      <button
                                        className="inline-flex items-center gap-1 text-xs text-pink-600 hover:text-pink-700 transition-colors"
                                        aria-expanded={false}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                        <span className="text-xs">Purpose</span>
                                      </button>
                                    </PopoverTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    align="end"
                                    className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden"
                                  >
                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                      <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                    </div>
                                    <div className="p-3">
                                      <p className="text-sm text-gray-900 leading-5 break-words text-left">
                                        {booking.purpose || "No purpose specified"}
                                      </p>
                                    </div>
                                  </TooltipContent>
                                  <PopoverContent
                                    side="top"
                                    align="end"
                                    className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50"
                                  >
                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                      <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                    </div>
                                    <div className="p-3">
                                      <p className="text-sm text-gray-900 leading-5 break-words text-left">
                                        {booking.purpose || "No purpose specified"}
                                      </p>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </Tooltip>
                            </TooltipProvider>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Right section: Time, Status, Equipment */}
                <div className="flex items-center gap-6">
                  {/* Time Info */}
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <p className="text-xs font-medium text-gray-500">Started</p>
                      <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">{format(new Date(booking.startTime), "h:mm a")}</p>
                      <p className="text-xs text-gray-500">{format(new Date(booking.startTime), "M/d/yyyy")}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-medium text-gray-500">Ends</p>
                      <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">{format(new Date(booking.endTime), "h:mm a")}</p>
                      <p className="text-xs text-gray-500">{format(new Date(booking.endTime), "M/d/yyyy")}</p>
                    </div>
                  </div>
                  {/* Status */}
                  <div className="flex flex-col gap-2.5">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      status.label === "Active" ? "bg-green-100 text-green-800" :
                      status.label === "Scheduled" ? "bg-pink-100 text-pink-800" :
                      status.label === "Denied" ? "bg-red-100 text-red-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {status.label}
                    </span>
                  </div>
                  {/* Equipment */}
                  {items.length > 0 && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-2 w-[280px] h-[120px] flex flex-col shadow-sm">
                      <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
                        <h5 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Equipment</h5>
                      </div>
                      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
                        <div className="space-y-0.5">
                          {items.map((item: string, idx: number) => {
                            let statusValue = "pending";
                            try {
                              const resp = String(booking?.adminResponse || "");
                              const jsonMatch = resp.match(/\{"items":\{[^}]*\}\}/);
                              if (jsonMatch) {
                                const parsed = JSON.parse(jsonMatch[0]);
                                if (parsed.items && typeof parsed.items === "object") {
                                  const itemKey = String(item).toLowerCase().replace(/\s+/g, "_");
                                  for (const [key, value] of Object.entries(parsed.items)) {
                                    const normalizedKey = String(key).toLowerCase().replace(/\s+/g, "_");
                                    if (normalizedKey === itemKey || String(key).toLowerCase() === String(item).toLowerCase()) {
                                      statusValue = String(value);
                                      break;
                                    }
                                  }
                                }
                              }
                            } catch {}

                            return (
                              <div key={`eq-status-${id}-${idx}`} className="flex items-center justify-between py-1">
                                <span className="text-xs text-gray-700 font-medium">{item}</span>
                                <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                    statusValue === "prepared"
                                      ? "bg-green-100 text-green-700"
                                      : statusValue === "not_available" || statusValue === "not available"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {statusValue === "not_available" ? "not available" : statusValue}
                                </span>
                              </div>
                            );
                          })}
                          {hasOthers && (() => {
                            let otherStatusValue = "pending";
                            try {
                              const resp = String(booking?.adminResponse || "");
                              const jsonMatch = resp.match(/\{"items":\{[^}]*\}\}/);
                              if (jsonMatch) {
                                const parsed = JSON.parse(jsonMatch[0]);
                                if (parsed.items && typeof parsed.items === "object") {
                                  const otherText = String(equipment.others).trim().toLowerCase();
                                  for (const [key, value] of Object.entries(parsed.items)) {
                                    if (String(key).toLowerCase() === otherText || String(key).toLowerCase().includes('other')) {
                                      otherStatusValue = String(value);
                                      break;
                                    }
                                  }
                                }
                              }
                            } catch {}
                            
                            return (
                              <div className="flex items-center justify-between py-1">
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
                                <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                    otherStatusValue === "prepared"
                                      ? "bg-green-100 text-green-700"
                                      : otherStatusValue === "not_available" || otherStatusValue === "not available"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {otherStatusValue === "not_available" ? "not available" : otherStatusValue}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
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
                      return (
                        <>
                          {baseMessage}
                          {equipment && equipment.items && Array.isArray(equipment.items) && equipment.items.length > 0 ? (
                            <div className="mt-2">
                              <span className="block text-[11px] font-semibold text-gray-700">
                                Equipment status:
                              </span>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {Object.entries(equipment.items).map(([itemKey, itemStatus]) => (
                                  <span
                                    key={itemKey}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${getEquipmentStatusColor(
                                      String(itemStatus)
                                    )}`}
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
            <div className="flex flex-col gap-2 sm:items-end">
              <button
                onClick={async () => {
                  if (notification.readAt) return;
                  await onMarkNotificationRead(notification.id);
                }}
                disabled={notification.readAt || markNotificationReadPending}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  notification.readAt
                    ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                    : "bg-pink-600 text-white hover:bg-pink-700"
                }`}
              >
                {markNotificationReadPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="hidden sm:inline">Reading...</span>
                  </span>
                ) : (
                  "Mark Read"
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const bookingsShown = Math.min(itemsPerPage, userBookings.length);
  const notificationsShown = Math.min(itemsPerPage, notificationsData.length);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Recent Booking</h3>
            <p className="text-sm text-gray-600 mt-1">Your latest facility reservations</p>
          </div>
          <button
            onClick={() => {
              // Navigate to the Activity Logs section with the appropriate tab
              const newHash = activityTab === "booking" ? "#activity-logs:booking" : "#activity-logs:notifications";
              try {
                window.location.hash = newHash;
                window.dispatchEvent(new HashChangeEvent('hashchange'));
              } catch (e) {
                onSelectViewAllBookingHistory();
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
            Booking History
          </button>
          <button
            onClick={() => onChangeTab("notifications")}
            className={`flex-1 sm:flex-none px-3 py-2 rounded whitespace-nowrap text-sm transition-colors ${activityTab === "notifications" ? "bg-pink-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            Notification Logs
          </button>
        </div>
      </div>

      {activityTab === "booking" ? renderBookingList() : renderNotificationList()}

      <div className="pt-4 border-t border-gray-100 mt-6 flex items-center justify-between text-sm text-gray-600">
        {activityTab === "booking" ? (
          <p>Showing {bookingsShown} of {userBookings.length} booking{userBookings.length !== 1 ? 's' : ''}</p>
        ) : (
          <p>Showing {notificationsShown} of {notificationsData.length} notification{notificationsData.length !== 1 ? 's' : ''}</p>
        )}
      </div>
    </div>
  );
}

import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { Plus, Calendar, Eye, Loader2 } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SkeletonListItem } from "@/components/ui/skeleton-presets";

interface MyBookingsSectionProps {
  user: any;
  userBookings: any[];
  facilities: any[];
  isUserBookingsLoading: boolean;
  isUserBookingsFetching: boolean;
  itemsPerPage: number;
  openBookingModal: (facilityId?: number, start?: Date, end?: Date) => void;
  getBookingStatus: (booking: any) => { label: string; badgeClass: string };
  getFacilityDisplay: (facilityId: number) => string;
  openOthers: Record<string, boolean>;
  setOpenOthers: Dispatch<SetStateAction<Record<string, boolean>>>;
  onViewAllBookingHistory: () => void;
  canEditBooking: (booking: any) => boolean;
  onEditBooking: (booking: any) => void;
  canCancelBooking: (booking: any) => boolean;
  onCancelBooking: (booking: any) => void;
  cancelBookingMutationStatus: "idle" | "pending" | "success" | "error";
  onArrivalCountdownExpire?: (booking: any) => void;
  onActiveCountdownExpire?: (booking: any) => void;
  scrollToBookingId?: string | null;
  onResetScrollHighlight?: () => void;
}

function Countdown({ expiry, onExpire }: { expiry: string | Date | undefined; onExpire?: () => void }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!expiry) return;
    const ms = new Date(expiry).getTime() - now;
    if (ms <= 0) onExpire?.();
  }, [expiry, now, onExpire]);

  if (!expiry) return <span />;

  const diff = Math.max(0, new Date(expiry).getTime() - now);
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1_000);

  return (
    <span className="font-mono text-base font-semibold">
      {hours.toString().padStart(2, "0")}:{mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
    </span>
  );
}

export function MyBookingsSection({
  user,
  userBookings,
  facilities,
  isUserBookingsLoading,
  isUserBookingsFetching,
  itemsPerPage,
  openBookingModal,
  getBookingStatus,
  getFacilityDisplay,
  openOthers,
  setOpenOthers,
  onViewAllBookingHistory,
  canEditBooking,
  onEditBooking,
  canCancelBooking,
  onCancelBooking,
  cancelBookingMutationStatus,
  onArrivalCountdownExpire,
  onActiveCountdownExpire,
  scrollToBookingId,
  onResetScrollHighlight,
}: MyBookingsSectionProps) {
  const summaryCount = useMemo(() => Math.min(itemsPerPage, userBookings.length), [itemsPerPage, userBookings.length]);
  const visibleBookings = useMemo(() => userBookings.slice(0, itemsPerPage), [userBookings, itemsPerPage]);

  useEffect(() => {
    if (!scrollToBookingId) return;
    const el = document.getElementById(`booking-${scrollToBookingId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-pink-400", "ring-offset-2");
    const timer = window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-pink-400", "ring-offset-2");
      onResetScrollHighlight?.();
    }, 2500);
    return () => {
      window.clearTimeout(timer);
      el.classList.remove("ring-2", "ring-pink-400", "ring-offset-2");
    };
  }, [scrollToBookingId, onResetScrollHighlight]);

  const renderHeader = () => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
      <div>
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">My Bookings</h3>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">Manage your facility reservations</p>
      </div>
      <button
        onClick={() => openBookingModal()}
        className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 text-sm sm:text-base self-start sm:self-auto"
      >
        <Plus className="h-4 w-4" />
        New Booking
      </button>
    </div>
  );

  if (isUserBookingsLoading || isUserBookingsFetching) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        {renderHeader()}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (userBookings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        {renderHeader()}
        <div className="text-center py-12">
          <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-gray-400" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h4>
          <p className="text-gray-600 mb-6">Create your first booking to get started with facility reservations.</p>
          <button
            onClick={() => openBookingModal()}
            className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            Create your first booking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      {renderHeader()}

      <div className="space-y-4">
        {visibleBookings.map((booking) => {
          const status = getBookingStatus(booking);
          const statusColors: Record<string, string> = {
            Active: "bg-pink-100 text-pink-800 border-pink-200",
            Scheduled: "bg-yellow-50 text-yellow-800 border-yellow-100",
            Done: "bg-gray-100 text-gray-800 border-gray-200",
            Denied: "bg-red-100 text-red-800 border-red-200",
            Cancelled: "bg-gray-50 text-gray-700 border-gray-100",
          };
          const id = String(booking.id || Math.random());
          const eq = booking.equipment || {};
          const items = Array.isArray(eq.items) ? eq.items : [];
          const hasOthers = eq.others && String(eq.others).trim().length > 0;

          return (
            <div id={`booking-${booking.id}`} key={booking.id} className="bg-white border border-gray-200 rounded-xl p-3 sm:p-6 hover:shadow-md transition-all duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-2">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                  <div className="bg-pink-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                    <Calendar className="h-4 w-4 sm:h-6 sm:w-6 text-pink-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm sm:text-lg text-gray-900 truncate">{getFacilityDisplay(booking.facilityId)}</h4>
                    <p className="text-[10px] sm:text-sm text-gray-600">Room #{booking.facilityId}</p>
                  </div>
                </div>
                <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-sm font-medium border self-start flex-shrink-0 whitespace-nowrap ${statusColors[status.label] || "bg-gray-100 text-gray-800 border-gray-200"}`}>
                  <span
                    className={`w-2 h-2 rounded-full mr-1 sm:mr-2 inline-block ${
                      status.label === "Active"
                        ? "bg-green-500"
                        : status.label === "Scheduled"
                          ? "bg-yellow-500"
                          : status.label === "Done"
                            ? "bg-gray-500"
                            : status.label === "Denied"
                              ? "bg-red-500"
                              : status.label === "Cancelled"
                                ? "bg-orange-500"
                                : "bg-gray-500"
                    }`}
                  />
                  {status.label}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Date &amp; Time</p>
                  <p className="text-sm sm:text-base font-semibold text-gray-900 break-words">
                    {new Date(booking.startTime).toLocaleDateString("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {new Date(booking.startTime).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                    {" "}-
                    {new Date(booking.endTime).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Purpose</p>
                  {booking.purpose ? (
                    <TooltipProvider>
                      <Tooltip>
                        <Popover>
                          <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                              <div className="flex items-center gap-2 cursor-help">
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-pink-600 flex-shrink-0" />
                                <p className="text-gray-900 text-xs sm:text-sm">
                                  <span className="font-medium">View details</span>
                                </p>
                              </div>
                            </PopoverTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[90vw] sm:max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-3 sm:px-4 py-2 border-b border-gray-200">
                              <p className="font-medium text-xs sm:text-sm text-gray-800">Purpose</p>
                            </div>
                            <div className="p-3 max-h-48 overflow-y-auto">
                              <p className="text-xs sm:text-sm text-gray-900 leading-5 break-words font-normal">{booking.purpose}</p>
                            </div>
                          </TooltipContent>
                          <PopoverContent side="top" className="max-w-[90vw] sm:max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50 origin-top-left">
                            <div className="bg-gray-50 px-3 sm:px-4 py-2 border-b border-gray-200">
                              <p className="font-medium text-xs sm:text-sm text-gray-800">Purpose</p>
                            </div>
                            <div className="p-3 max-h-48 overflow-y-auto">
                              <p className="text-xs sm:text-sm text-gray-900 leading-5 break-words font-normal">{booking.purpose}</p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <p className="text-gray-900 text-xs sm:text-sm break-words">No purpose specified</p>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mt-2">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Course/Year/Department</p>
                  {booking.courseYearDept ? (
                    <TooltipProvider>
                      <Tooltip>
                        <Popover>
                          <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                              <div className="flex items-center gap-2 cursor-help">
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-pink-600 flex-shrink-0" />
                                <p className="text-gray-900 text-xs sm:text-sm">
                                  <span className="font-medium">View details</span>
                                </p>
                              </div>
                            </PopoverTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[90vw] sm:max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-3 sm:px-4 py-2 border-b border-gray-200">
                              <p className="font-medium text-xs sm:text-sm text-gray-800">Course/Year/Department</p>
                            </div>
                            <div className="p-3 max-h-48 overflow-y-auto">
                              <p className="text-xs sm:text-sm text-gray-900 leading-5 break-words font-normal">{booking.courseYearDept}</p>
                            </div>
                          </TooltipContent>
                          <PopoverContent side="top" className="max-w-[90vw] sm:max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50 origin-top-left">
                            <div className="bg-gray-50 px-3 sm:px-4 py-2 border-b border-gray-200">
                              <p className="font-medium text-xs sm:text-sm text-gray-800">Course/Year/Department</p>
                            </div>
                            <div className="p-3 max-h-48 overflow-y-auto">
                              <p className="text-xs sm:text-sm text-gray-900 leading-5 break-words font-normal">{booking.courseYearDept}</p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <p className="text-gray-900 text-xs sm:text-sm break-words">No course/year/department specified</p>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  {booking.equipment && (hasOthers || items.length > 0) && (
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-xs sm:text-sm font-medium text-gray-700">Equipment or Needs</div>
                        {hasOthers && (
                          <Popover open={!!openOthers[id]} onOpenChange={(v) => setOpenOthers((prev) => ({ ...prev, [id]: v }))}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <PopoverTrigger asChild>
                                    <button
                                      onClick={() => setOpenOthers((prev) => ({ ...prev, [id]: !prev[id] }))}
                                      className="flex items-center gap-1 text-[10px] sm:text-[11px] text-gray-700 hover:text-pink-600 transition-colors"
                                      aria-expanded={!!openOthers[id]}
                                    >
                                      <Eye className="h-3 w-3 text-pink-600" />
                                      <span>View other</span>
                                    </button>
                                  </PopoverTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[90vw] sm:max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                  <div className="bg-gray-50 px-3 sm:px-4 py-2 border-b border-gray-200">
                                    <p className="font-semibold text-xs sm:text-sm text-gray-800">Other equipment</p>
                                  </div>
                                  <div className="p-3 max-h-48 overflow-y-auto">
                                    <p className="whitespace-pre-wrap text-xs sm:text-sm text-gray-900 leading-5 break-words font-normal">{String(eq.others).trim()}</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <PopoverContent side="top" className="max-w-[90vw] sm:max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50">
                              <div className="bg-gray-50 px-3 sm:px-4 py-2 border-b border-gray-200">
                                <p className="font-semibold text-xs sm:text-sm text-gray-800">Other equipment</p>
                              </div>
                              <div className="p-3 max-h-48 overflow-y-auto">
                                <p className="text-xs sm:text-sm text-gray-900 leading-5 break-words font-normal">{String(eq.others).trim()}</p>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mt-2">
                        {items.map((item: string, idx: number) => {
                          let itemStatus: "prepared" | "not_available" | undefined;
                          try {
                            const resp = String(booking?.adminResponse || "");
                            const jsonMatch = resp.match(/\{"items":\{[^}]*\}\}/);
                            if (jsonMatch) {
                              const parsed = JSON.parse(jsonMatch[0]);
                              if (parsed.items && typeof parsed.items === "object") {
                                const itemKey = String(item).toLowerCase().replace(/\s+/g, "_");
                                const itemKeyNoUnderscore = String(item).toLowerCase().replace(/_/g, " ");
                                for (const [key, value] of Object.entries(parsed.items)) {
                                  const normalizedKey = String(key).toLowerCase().replace(/\s+/g, "_");
                                  const keyNoUnderscore = String(key).toLowerCase().replace(/_/g, " ");
                                  if (
                                    normalizedKey === itemKey ||
                                    key === item ||
                                    keyNoUnderscore === itemKeyNoUnderscore ||
                                    String(key).toLowerCase() === String(item).toLowerCase()
                                  ) {
                                    const val = String(value).toLowerCase();
                                    if (val === "prepared" || val === "true" || val === "yes") {
                                      itemStatus = "prepared";
                                    } else if (val === "not_available" || val === "not available" || val === "false" || val === "no") {
                                      itemStatus = "not_available";
                                    }
                                    break;
                                  }
                                }
                              }
                            }

                            if (!itemStatus) {
                              const match = resp.match(/Needs:\s*(Prepared|Not Available)/i);
                              if (match) itemStatus = /prepared/i.test(match[1]) ? "prepared" : "not_available";
                            }
                          } catch {
                            // ignore parse errors
                          }

                          let chipClass = "text-[10px] sm:text-xs bg-pink-50 text-pink-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border border-pink-200 whitespace-nowrap";
                          if (itemStatus === "prepared") {
                            chipClass = "text-[10px] sm:text-xs bg-green-100 text-green-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border border-green-200 whitespace-nowrap";
                          } else if (itemStatus === "not_available") {
                            chipClass = "text-[10px] sm:text-xs bg-red-100 text-red-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border border-red-200 whitespace-nowrap";
                          }

                          return (
                            <span key={`eq-${id}-${idx}`} className={chipClass}>
                              {item}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Group Size</p>
                  <p className="font-semibold text-gray-900">
                    <span className="inline-flex items-center gap-1.5 sm:gap-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs sm:text-sm font-medium">
                      <svg className="h-3 w-3 text-gray-600 flex-shrink-0" viewBox="0 0 8 8" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="4" cy="4" r="4" />
                      </svg>
                      <span>{booking.participants != null ? booking.participants : 1}</span>
                      <span className="text-[10px] sm:text-xs text-gray-600 whitespace-nowrap">
                        participant{booking.participants != null && booking.participants > 1 ? "s" : ""}
                      </span>
                    </span>
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                    {(() => {
                      const facility = facilities.find((f) => f.id === booking.facilityId);
                      if (!facility) return "";
                      return `Max capacity: ${facility.capacity || 8}`;
                    })()}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 sm:pt-4 border-t border-gray-100">
                <div className="text-[11px] sm:text-sm text-gray-500">
                  <div className="mb-2">Booked on {new Date(booking.createdAt || booking.startTime).toLocaleDateString()}</div>
                  {status.label === "Active" && booking.userId === user?.id && (
                    <div className="mt-2">
                      {booking.arrivalConfirmationDeadline && !booking.arrivalConfirmed ? (
                        <div className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg">
                          <span className="text-[10px] sm:text-xs font-medium text-amber-700 whitespace-nowrap">Confirm in:</span>
                          <Countdown expiry={booking.arrivalConfirmationDeadline} onExpire={() => onArrivalCountdownExpire?.(booking)} />
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-lg shadow-sm">
                          <span className="text-[10px] sm:text-xs font-medium text-green-700 whitespace-nowrap">Time remaining:</span>
                          <Countdown expiry={booking.endTime} onExpire={() => onActiveCountdownExpire?.(booking)} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {canEditBooking(booking) && (
                    <button
                      onClick={() => onEditBooking(booking)}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-pink-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-pink-700 transition-colors duration-200 whitespace-nowrap"
                    >
                      Edit
                    </button>
                  )}
                  {canCancelBooking(booking) && booking.userId === user?.id && (
                    <button
                      onClick={() => onCancelBooking(booking)}
                      disabled={cancelBookingMutationStatus === "pending"}
                      className={`flex-1 sm:flex-none px-3 py-1.5 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap ${
                        cancelBookingMutationStatus === "pending" ? "bg-red-400 cursor-wait" : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {cancelBookingMutationStatus === "pending" ? (
                        <>
                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                          <span className="hidden sm:inline">Processing...</span>
                        </>
                      ) : (
                        status.label === "Active" ? "End Booking" : "Cancel"
                      )}
                    </button>
                  )}
                  {!canEditBooking(booking) && (!canCancelBooking(booking) || booking.userId !== user?.id) && status.label !== "Active" && (
                    <span className="text-gray-400 text-[11px] sm:text-sm">No actions available</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {userBookings.length > itemsPerPage && (
          <div className="pt-6 border-t border-gray-200">
            <div className="flex items-center justify-end">
              <button onClick={onViewAllBookingHistory} className="text-pink-600 hover:text-pink-800 font-medium text-sm transition-colors duration-200">
                View All →
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-gray-100 mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">Showing {summaryCount} of {userBookings.length} bookings</p>
        <div className="flex items-center gap-2" />
      </div>
    </div>
  );
}

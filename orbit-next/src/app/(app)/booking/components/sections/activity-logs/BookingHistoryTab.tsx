import { Dispatch, SetStateAction } from "react";
import { format } from "date-fns";
import { Calendar, Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SkeletonListItem } from "@/components/ui/skeleton-presets";

interface BookingHistoryTabProps {
  userBookings: any[];
  isUserBookingsLoading: boolean;
  isUserBookingsFetching: boolean;
  searchTerm: string;
  activityBookingPage: number;
  setActivityBookingPage: Dispatch<SetStateAction<number>>;
  bookingsPerPage: number;
  openOthers: Record<string, boolean>;
  setOpenOthers: Dispatch<SetStateAction<Record<string, boolean>>>;
  getBookingStatus: (booking: any) => { label: string; badgeClass: string };
  getFacilityDisplay: (facilityId: number) => string;
  onNavigateToBookingDetails: (bookingId: string) => void;
}

export function BookingHistoryTab({
  userBookings,
  isUserBookingsLoading,
  isUserBookingsFetching,
  searchTerm,
  activityBookingPage,
  setActivityBookingPage,
  bookingsPerPage,
  openOthers,
  setOpenOthers,
  getBookingStatus,
  getFacilityDisplay,
  onNavigateToBookingDetails,
}: BookingHistoryTabProps) {
  const filteredUserBookings = userBookings.filter((booking: any) => {
    if (!searchTerm) return true;
    const lowerSearch = searchTerm.toLowerCase();
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

  if (isUserBookingsLoading || isUserBookingsFetching) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonListItem key={index} />
        ))}
      </div>
    );
  }

  if (filteredUserBookings.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 text-sm">
          {searchTerm ? "No bookings match your search" : "No booking history"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filteredUserBookings
        .slice(activityBookingPage * bookingsPerPage, (activityBookingPage + 1) * bookingsPerPage)
        .map((booking) => {
          const id = String(booking.id || Math.random());
          const eq = booking.equipment || {};
          const items = Array.isArray(eq.items) ? eq.items : [];
          const hasOthers = eq.others && String(eq.others).trim().length > 0;
          const status = getBookingStatus(booking);

          return (
            <div
              key={booking.id}
              className="relative grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 items-start"
            >
              <div className="absolute top-3 right-3 md:hidden flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  status.label === "Active"
                    ? "bg-pink-100 text-pink-800"
                    : status.label === "Scheduled"
                    ? "bg-yellow-50 text-yellow-800"
                    : status.label === "Denied"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
                }`}>
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
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-gray-900 text-sm truncate">
                      {getFacilityDisplay(booking.facilityId)}
                    </h4>
                    <p className="text-xs text-gray-600 truncate">
                      {format(new Date(booking.startTime), "EEE, MMM d")} • {format(new Date(booking.startTime), "hh:mm a")}
                    </p>
                    {booking.participants ? (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
                          <svg
                            className="h-3 w-3 text-gray-600"
                            viewBox="0 0 8 8"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <circle cx="4" cy="4" r="4" />
                          </svg>
                          <span>{booking.participants}</span>
                          <span className="text-[10px]">
                            participant{booking.participants > 1 ? "s" : ""}
                          </span>
                        </span>
                      </div>
                    ) : null}
                    <div className="text-[11px] text-gray-800 mt-2">
                      {(booking.purpose || "").length > 30 ? (
                        <TooltipProvider>
                          <Tooltip>
                            <Popover>
                              <TooltipTrigger asChild>
                                <PopoverTrigger asChild>
                                  <button
                                    className="flex items-center gap-1 text-[11px] text-gray-700"
                                    aria-expanded={false}
                                  >
                                    <Eye className="h-3 w-3 text-pink-600" />
                                    <span className="text-gray-700">View purpose</span>
                                  </button>
                                </PopoverTrigger>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden"
                              >
                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                  <p className="font-medium text-sm text-gray-800">Full Purpose</p>
                                </div>
                                <div className="p-4 max-h-48 overflow-y-auto">
                                  <p className="whitespace-pre-wrap text-sm text-gray-900 leading-6 break-words font-normal">
                                    {booking.purpose}
                                  </p>
                                </div>
                              </TooltipContent>
                              <PopoverContent
                                side="top"
                                className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50 origin-top-left"
                              >
                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                  <p className="font-medium text-sm text-gray-800">Full Purpose</p>
                                </div>
                                <div className="p-3">
                                  <p className="text-sm text-gray-900 leading-5 break-words font-normal">
                                    {booking.purpose || "No purpose specified"}
                                  </p>
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
                  {hasOthers ? (
                    <TooltipProvider>
                      <Tooltip>
                        <Popover
                          open={!!openOthers[id]}
                          onOpenChange={(value) => setOpenOthers((prev) => ({ ...prev, [id]: value }))}
                        >
                          <TooltipTrigger asChild>
                            <PopoverTrigger asChild>
                              <div className="flex items-center gap-2 cursor-help">
                                <Eye className="h-3 w-3 text-pink-600 flex-shrink-0" />
                                <p className="text-[11px] text-gray-800 font-medium">View other</p>
                              </div>
                            </PopoverTrigger>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden"
                          >
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                              <p className="font-semibold text-sm text-gray-800">Other equipment</p>
                            </div>
                            <div className="p-3">
                              <p className="whitespace-pre-wrap text-sm text-gray-900 leading-6 break-words font-normal">
                                {String(eq.others).trim()}
                              </p>
                            </div>
                          </TooltipContent>
                          <PopoverContent
                            side="top"
                            className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50 origin-top-left"
                          >
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                              <p className="font-semibold text-sm text-gray-800">Other equipment</p>
                            </div>
                            <div className="p-3 max-h-48 overflow-y-auto">
                              <p className="text-sm text-gray-900 leading-5 break-words font-normal">
                                {String(eq.others).trim()}
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-1.5">
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
                              } else if (
                                val === "not_available" ||
                                val === "not available" ||
                                val === "false" ||
                                val === "no"
                              ) {
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

              <div className="col-span-1 min-w-0">
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-xs font-medium text-gray-500">Equipment Status</div>
                    <button
                      onClick={() => onNavigateToBookingDetails(String(booking.id))}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {(() => {
                      const resp = String(booking?.adminResponse || "");
                      if (!resp) {
                        return <p className="text-xs text-gray-500">No admin response yet.</p>;
                      }
                      const statuses: Array<{ item: string; status: string }> = [];
                      try {
                        const jsonMatch = resp.match(/\{"items":\{[^}]*\}\}/);
                        if (jsonMatch) {
                          const parsed = JSON.parse(jsonMatch[0]);
                          if (parsed.items && typeof parsed.items === "object") {
                            for (const [key, value] of Object.entries(parsed.items)) {
                              statuses.push({ item: key, status: String(value) });
                            }
                          }
                        }
                      } catch {
                        // ignore parse errors
                      }
                      if (statuses.length === 0) {
                        return <p className="text-xs text-gray-500">No equipment updates from admin.</p>;
                      }
                      return statuses.map(({ item, status: statusValue }) => (
                        <div key={item} className="flex items-center justify-between">
                          <span className="text-xs text-gray-700">{item}</span>
                          <span
                            className={`text-xs font-medium ${
                              statusValue === "prepared" ? "text-green-600" : "text-red-500"
                            }`}
                          >
                            {statusValue.replace(/_/g, " ")}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              <div className="col-span-1 min-w-0">
                <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Booking Actions
                  </div>
                  <p className="text-[11px] text-gray-600">Manage this reservation from the My Bookings view.</p>
                  <button
                    onClick={() => onNavigateToBookingDetails(String(booking.id))}
                    className="w-full px-3 py-1.5 bg-pink-600 text-white text-xs rounded-lg font-medium hover:bg-pink-700 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}

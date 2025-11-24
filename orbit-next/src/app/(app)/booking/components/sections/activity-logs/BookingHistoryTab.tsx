import { Dispatch, SetStateAction, useState } from "react";
import { format } from "date-fns";
import { Calendar, Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SkeletonListItem } from "@/components/ui/skeleton-presets";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
              className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 hover:border-pink-200 hover:shadow-sm transition-all duration-200 cursor-pointer"
              onClick={() => {
                setSelectedBooking(booking);
                setIsModalOpen(true);
              }}
            >
              {/* Desktop layout */}
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
                  {/* Equipment List */}
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
                                  const otherText = String(eq.others).trim().toLowerCase();
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
                                          <p className="text-sm text-gray-900 leading-5 break-words">{String(eq.others).trim()}</p>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <PopoverContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50">
                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                      <p className="font-semibold text-sm text-gray-800">Other equipment</p>
                                    </div>
                                    <div className="p-3 max-h-48 overflow-y-auto">
                                      <p className="text-sm text-gray-900 leading-5 break-words">{String(eq.others).trim()}</p>
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

      {/* Booking Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              {/* Facility */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Facility</h3>
                <p className="text-base text-gray-900">{getFacilityDisplay(selectedBooking.facilityId)}</p>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Start Time</h3>
                  <p className="text-base text-gray-900">{format(new Date(selectedBooking.startTime), "PPpp")}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">End Time</h3>
                  <p className="text-base text-gray-900">{format(new Date(selectedBooking.endTime), "PPpp")}</p>
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Status</h3>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getBookingStatus(selectedBooking).badgeClass}`}>
                  {getBookingStatus(selectedBooking).label}
                </span>
              </div>

              {/* Purpose */}
              {selectedBooking.purpose && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Purpose</h3>
                  <p className="text-base text-gray-900 whitespace-pre-wrap">{selectedBooking.purpose}</p>
                </div>
              )}

              {/* Participants */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Participants</h3>
                <p className="text-base text-gray-900">{selectedBooking.participants || 0}</p>
              </div>

              {/* Course/Year/Dept */}
              {selectedBooking.courseYearDept && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Course/Year/Dept</h3>
                  <p className="text-base text-gray-900">{selectedBooking.courseYearDept}</p>
                </div>
              )}

              {/* Equipment */}
              {selectedBooking.equipment && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Equipment</h3>
                  <div className="space-y-2">
                    {Array.isArray(selectedBooking.equipment.items) && selectedBooking.equipment.items.map((item: string, idx: number) => {
                      let statusValue = "pending";
                      try {
                        const resp = String(selectedBooking?.adminResponse || "");
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
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700 font-medium">{item}</span>
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            statusValue === "prepared" ? "bg-green-100 text-green-700" :
                            statusValue === "not_available" || statusValue === "not available" ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {statusValue === "not_available" ? "not available" : statusValue}
                          </span>
                        </div>
                      );
                    })}
                    {selectedBooking.equipment.others && String(selectedBooking.equipment.others).trim().length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-600 mb-1">Other Equipment</h4>
                        <p className="text-sm text-gray-900 p-2 bg-gray-50 rounded">{selectedBooking.equipment.others}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

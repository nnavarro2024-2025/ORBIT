import { Dispatch, SetStateAction, useMemo } from "react";
import { format } from "date-fns";
import { Calendar } from "lucide-react";

import { AvailabilityGrid } from "@/components/common";
import { SkeletonFacilityCard } from "@/components/ui/skeleton-presets";

interface AvailableRoomsSectionProps {
  user: any;
  facilities: any[];
  isFacilitiesLoading: boolean;
  isFacilitiesFetching: boolean;
  availabilityMap: Map<number, any>;
  unavailableDatesByFacility: Record<string, string[]>;
  getFacilityBookingStatus: (facilityId: number) => {
    status: string;
    label: string;
    badgeClass: string;
    booking: any;
  };
  getFacilityDescriptionByName: (name?: string) => string;
  getFacilityImageByName: (name?: string) => string;
  formatFacilityName: (name: string) => string;
  isRestrictedFacility: (facility: any) => boolean;
  isLibraryClosedNow: () => boolean;
  devForceOpen: boolean;
  setDevForceOpen: Dispatch<SetStateAction<boolean>>;
  openBookingModal: (facilityId?: number, start?: Date, end?: Date) => void;
  setSelectedFacilityForBooking: (facilityId: number | null) => void;
  setInitialStartForBooking: (date: Date | null) => void;
  setInitialEndForBooking: (date: Date | null) => void;
  setInitialTimesAreSuggested: (value: boolean) => void;
  toast: (args: { title: string; description?: string; variant?: "default" | "destructive" }) => void;
  variant?: "dashboard" | "full";
  className?: string;
  showAvailabilityGrid?: boolean;
}

const FacilityStatusBadge = ({
  facility,
  bookingStatus,
}: {
  facility: any;
  bookingStatus: { status: string; label: string };
}) => {
  const classes = `px-3 py-1 rounded-full text-sm font-medium ${
    !facility.isActive
      ? "bg-red-500 text-white"
      : bookingStatus.status === "closed"
        ? "bg-gray-700 text-white"
        : bookingStatus.status === "booked"
          ? "bg-red-500 text-white"
          : bookingStatus.status === "scheduled"
            ? "bg-yellow-500 text-white"
            : "bg-pink-500 text-white"
  }`;

  return <span className={classes}>{!facility.isActive ? "Unavailable" : bookingStatus.label}</span>;
};

export function AvailableRoomsSection({
  user,
  facilities,
  isFacilitiesLoading,
  isFacilitiesFetching,
  availabilityMap,
  unavailableDatesByFacility,
  getFacilityBookingStatus,
  getFacilityDescriptionByName,
  getFacilityImageByName,
  formatFacilityName,
  isRestrictedFacility,
  isLibraryClosedNow,
  devForceOpen,
  setDevForceOpen,
  openBookingModal,
  setSelectedFacilityForBooking,
  setInitialStartForBooking,
  setInitialEndForBooking,
  setInitialTimesAreSuggested,
  toast,
  variant = "full",
  className,
  showAvailabilityGrid = true,
}: AvailableRoomsSectionProps) {
  const filteredFacilities = useMemo(() => {
    const userRole = user?.role || "student";

    return facilities.filter((facility) => {
      const restricted = isRestrictedFacility(facility);

      if (userRole === "admin") return true;
      if (userRole === "faculty") return restricted;

      return !restricted;
    });
  }, [facilities, isRestrictedFacility, user?.role]);

  const handleOpenBooking = (facility: any, start?: Date, end?: Date) => {
    const restricted = isRestrictedFacility(facility);
    const userRole = user?.role || "student";
    const allowed = userRole === "faculty" || userRole === "admin";

    if (restricted && !allowed) {
      toast({
        title: "Access Restricted",
        description: "Only faculty members may book this facility. Contact an administrator for access.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFacilityForBooking(facility.id);
    setInitialStartForBooking(start ?? null);
    setInitialEndForBooking(end ?? null);
    setInitialTimesAreSuggested(Boolean(start && end));
    openBookingModal(facility.id, start, end);
  };

  const renderFacilityCard = (facility: any) => {
    const bookingStatus = getFacilityBookingStatus(facility.id);
    const isAvailableForBooking = facility.isActive && bookingStatus.status === "available";
    // Allow booking request if facility is active (regardless of current booking status)
    const canRequestBooking = facility.isActive;
    const isOwnerOrAdmin = user?.role === "admin" || bookingStatus.booking?.userId === user?.id;

    const nextAvailableInfo = (() => {
      try {
        const entry = availabilityMap.get(facility.id);
        if (!entry || !Array.isArray(entry.slots)) return null;

        const slots = entry.slots as Array<{ start: string; end: string; status: string }>;
        if (slots.length === 0) return null;

        const ranges: Array<{ start: string; end: string; status: string }> = [];
        let current = { ...slots[0] };

        for (let i = 1; i < slots.length; i++) {
          const slot = slots[i];
          if (slot.status === current.status && new Date(slot.start).getTime() === new Date(current.end).getTime()) {
            current = { ...current, end: slot.end };
          } else {
            ranges.push(current);
            current = { ...slot };
          }
        }
        ranges.push(current);

        const now = new Date();
        const nextAvailable = ranges.find((range) => range.status === "available" && new Date(range.end) > now && new Date(range.start) >= now);
        if (!nextAvailable) return null;

        const start = new Date(nextAvailable.start);
        const end = new Date(nextAvailable.end);

        return {
          start,
          end,
          label: `${format(start, "EEE, MMM d")} • ${format(start, "hh:mm a")} - ${format(end, "hh:mm a")}`,
        };
      } catch (_error) {
        return null;
      }
    })();

    return (
      <div
        key={facility.id}
        className={`group bg-white border rounded-xl overflow-hidden transition-all duration-300 flex flex-col h-full ${
          isAvailableForBooking ? "border-gray-200 hover:shadow-lg cursor-pointer hover:border-pink-200" : "border-gray-100 bg-gray-50 opacity-80"
        }`}
        onClick={() => {
          if (!isAvailableForBooking) return;
          handleOpenBooking(facility);
        }}
      >
        <div className="aspect-video bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center relative">
          {isAvailableForBooking && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <FacilityStatusBadge facility={facility} bookingStatus={bookingStatus} />
            </div>
          )}

          {(() => {
            const image = facility.image ? `/images/${facility.image}` : facility.imageUrl || getFacilityImageByName(facility.name);

            if (!image) {
              return (
                <div className="text-center">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm">
                    <Calendar className={`h-8 w-8 ${isAvailableForBooking ? "text-gray-400" : "text-gray-300"}`} />
                  </div>
                  <p className={`text-sm ${isAvailableForBooking ? "text-gray-500" : "text-gray-400"}`}>No image available</p>
                </div>
              );
            }

            return (
              <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                <img
                  src={image}
                  alt={facility.name}
                  className={`w-full h-full object-cover transition-transform duration-300 ${isAvailableForBooking ? "group-hover:scale-105" : "grayscale"}`}
                  style={{ objectPosition: "center", width: "100%", height: "100%", aspectRatio: "16/9", minHeight: "180px", maxHeight: "320px" }}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              </div>
            );
          })()}
        </div>

        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-1">
            <h3
              className={`font-bold text-lg mb-1 transition-colors ${
                isAvailableForBooking ? "text-gray-900 group-hover:text-pink-700" : "text-gray-500"
              }`}
            >
              {formatFacilityName(facility.name)}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${bookingStatus.badgeClass}`}>{bookingStatus.label}</span>
          </div>

          {nextAvailableInfo && !isOwnerOrAdmin && facility.isActive && (
            <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-100 flex items-center justify-between">
              <div>
                <div className="text-xs text-green-800 font-medium">Next available booking</div>
                <div className="text-sm font-semibold text-gray-900">{nextAvailableInfo.label}</div>
              </div>
              <div>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    handleOpenBooking(facility, nextAvailableInfo.start, nextAvailableInfo.end);
                  }}
                  className="bg-pink-600 text-white px-3 py-1 rounded-lg text-sm"
                >
                  Book Now
                </button>
              </div>
            </div>
          )}

          <p className={`text-sm leading-relaxed mb-1 flex-grow ${isAvailableForBooking ? "text-gray-600" : "text-gray-500"}`}>
            {getFacilityDescriptionByName(facility.name)}
          </p>

          {bookingStatus.booking && bookingStatus.status !== "available" && (user?.role === "admin" || bookingStatus.booking?.userId === user?.id) && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-600 mb-1">
                {bookingStatus.booking?.status === "pending"
                  ? "Pending booking:"
                  : bookingStatus.status === "booked"
                    ? "Currently in use until:"
                    : bookingStatus.status === "scheduled"
                      ? "Next booking:"
                      : "Scheduled:"}
              </p>
              <p className="text-sm text-gray-900 font-medium">
                {bookingStatus.status === "booked"
                  ? new Date(bookingStatus.booking.endTime).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : `${format(new Date(bookingStatus.booking.startTime), "EEE, MMM d")} • ${format(new Date(bookingStatus.booking.startTime), "hh:mm a")} - ${format(new Date(bookingStatus.booking.endTime), "hh:mm a")}`}
              </p>
              {bookingStatus.booking?.status === "pending" && (
                <p className="text-xs text-gray-500 mt-1">Scheduled automatically; you'll be notified of any changes.</p>
              )}
            </div>
          )}

          <div className="mt-auto">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isAvailableForBooking ? "bg-green-500" : "bg-gray-400"}`} />
                <span className={`text-sm font-medium ${isAvailableForBooking ? "text-green-700" : "text-gray-500"}`}>
                  {`Up to ${facility.capacity || 8} people`}
                </span>
              </div>

              <div className="flex flex-col items-end">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!canRequestBooking) return;

                    handleOpenBooking(facility);
                  }}
                  disabled={!canRequestBooking}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 shadow-sm flex-shrink-0 ${
                    !facility.isActive
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : isAvailableForBooking
                        ? "bg-pink-600 hover:bg-pink-700 text-white"
                        : "bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200"
                  }`}
                >
                  {!facility.isActive ? "Unavailable" : isAvailableForBooking ? "Book Now" : "Request Booking"}
                </button>

                {!isAvailableForBooking && facility.isActive && (
                  <p className="text-xs text-gray-500 mt-2 text-right max-w-xs">
                    {bookingStatus.status === "closed" 
                      ? "If requested outside school hours, the system will schedule it automatically and notify you of any changes."
                      : "Select a different time slot when booking"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const availableRooms = useMemo(() => {
    return facilities.filter((facility) => facility.isActive && getFacilityBookingStatus(facility.id).status === "available");
  }, [facilities, getFacilityBookingStatus]);

  return (
    <section className={className}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Available Study Rooms</h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Browse and book available facilities</p>

            {(isLibraryClosedNow() || facilities.some((facility) => getFacilityBookingStatus(facility.id).status === "closed")) && (
              <div className="mt-3 text-sm text-gray-500 bg-gray-50 rounded p-2 border border-gray-100">
                If you request a booking outside school hours, the system will schedule it automatically and notify you of any changes.
              </div>
            )}
          </div>

          {variant === "full" && process.env.NODE_ENV !== "production" && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">Dev: Force Open</label>
              <button
                onClick={() => setDevForceOpen((previous) => !previous)}
                className={`px-2 py-1 rounded text-sm ${devForceOpen ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700"}`}
              >
                {devForceOpen ? "ON" : "OFF"}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4 sm:gap-6">
          {(isFacilitiesLoading || isFacilitiesFetching)
            ? Array.from({ length: 6 }).map((_, index) => <SkeletonFacilityCard key={index} />)
            : filteredFacilities.map(renderFacilityCard)}
        </div>

        {!isFacilitiesLoading && !isFacilitiesFetching && filteredFacilities.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No facilities available</h4>
            <p className="text-gray-600">There are currently no facilities available for booking.</p>
          </div>
        )}

        {!isFacilitiesLoading && !isFacilitiesFetching && filteredFacilities.length > 0 && availableRooms.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-red-500" />
            </div>
            {isLibraryClosedNow() ? (
              <>
                <h4 className="text-lg font-medium text-gray-900 mb-2">School Closed</h4>
                <p className="text-gray-600">The school is currently closed. Please return during normal operating hours (7:30 AM – 7:00 PM).</p>
              </>
            ) : (
              <>
                <h4 className="text-lg font-medium text-gray-900 mb-2">All rooms are currently booked</h4>
                <p className="text-gray-600">All facilities are currently in use, scheduled, or otherwise unavailable. Please check back later or contact school staff for assistance.</p>
              </>
            )}
          </div>
        )}

        {showAvailabilityGrid && (
          <AvailabilityGrid
            onSelectRange={(facilityId: number, startISO: string, endISO: string) => {
              const start = new Date(startISO);
              const end = new Date(endISO);

              setSelectedFacilityForBooking(facilityId);
              setInitialStartForBooking(start);
              setInitialEndForBooking(end);
              setInitialTimesAreSuggested(true);
              openBookingModal(facilityId, start, end);
            }}
            unavailableDatesByFacility={unavailableDatesByFacility}
          />
        )}
      </div>
    </section>
  );
}

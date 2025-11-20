"use client";

import React, { Dispatch, SetStateAction, useMemo } from "react";
import { FacilityBooking } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AdminSearchBar } from "@/components/common";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowUpDown, CheckCircle, ChevronLeft, ChevronRight, Clock, Eye, Loader2 } from "lucide-react";
import { ActiveBookingsTab, ScheduledBookingsTab } from './tabs';

export type MutationRef<TArg> = {
  mutate: (arg: TArg) => void;
  isPending: boolean;
};

export type BookingManagementSectionProps = {
  isAdmin: boolean;
  bookingTab: string;
  setBookingTab: Dispatch<SetStateAction<string>>;
  globalFacilityBookingSearch: string;
  setGlobalFacilityBookingSearch: Dispatch<SetStateAction<string>>;
  facilityFilter: string;
  setFacilityFilter: Dispatch<SetStateAction<string>>;
  facilitySort: "asc" | "desc";
  toggleFacilitySort: () => void;
  facilityOptions: Array<{ id: string; name: string }>;
  activeBookings: FacilityBooking[];
  upcomingBookings: FacilityBooking[];
  pendingBookings: FacilityBooking[];
  itemsPerPage: number;
  activeBookingsPage: number;
  setActiveBookingsPage: Dispatch<SetStateAction<number>>;
  upcomingBookingsPage: number;
  setUpcomingBookingsPage: Dispatch<SetStateAction<number>>;
  renderEquipmentLine: (booking: FacilityBooking) => React.ReactNode;
  getNeedsStatusForBooking: (booking: FacilityBooking) => "prepared" | "not_available" | undefined;
  openPurpose: Record<string, boolean>;
  setOpenPurpose: Dispatch<SetStateAction<Record<string, boolean>>>;
  getUserEmail: (id: FacilityBooking["userId"]) => string;
  getFacilityName: (id: FacilityBooking["facilityId"]) => string;
  formatDateTime: (value: FacilityBooking["startTime"]) => string;
  formatDate: (value: FacilityBooking["startTime"]) => string;
  formatTime: (value: FacilityBooking["startTime"]) => string;
  CountdownComponent: (props: { expiry: string | Date | undefined; onExpire?: () => void }) => React.ReactNode;
  onArrivalExpire: (booking: FacilityBooking) => void;
  onBookingEndExpire: (booking: FacilityBooking) => void;
  confirmArrivalMutation: MutationRef<{ bookingId: FacilityBooking["id"] }>;
  openEquipmentModal: (booking: FacilityBooking) => void;
  forceActiveBookingMutation: MutationRef<FacilityBooking>;
};

export function BookingManagementSection({
  isAdmin,
  bookingTab,
  setBookingTab,
  globalFacilityBookingSearch,
  setGlobalFacilityBookingSearch,
  facilityFilter,
  setFacilityFilter,
  facilitySort,
  toggleFacilitySort,
  facilityOptions,
  activeBookings,
  upcomingBookings,
  pendingBookings,
  itemsPerPage,
  activeBookingsPage,
  setActiveBookingsPage,
  upcomingBookingsPage,
  setUpcomingBookingsPage,
  renderEquipmentLine,
  getNeedsStatusForBooking,
  openPurpose,
  setOpenPurpose,
  getUserEmail,
  getFacilityName,
  formatDateTime,
  formatDate,
  formatTime,
  CountdownComponent,
  onArrivalExpire,
  onBookingEndExpire,
  confirmArrivalMutation,
  openEquipmentModal,
  forceActiveBookingMutation,
}: BookingManagementSectionProps) {
  const bookingSearchTerm = globalFacilityBookingSearch.trim().toLowerCase();

  const activeBookingsFiltered = useMemo(() => {
    if (!bookingSearchTerm) return activeBookings;
    return activeBookings.filter((booking) => {
      const haystack = [
        getUserEmail(booking.userId),
        getFacilityName(booking.facilityId),
        booking.purpose,
        booking.status,
        booking.courseYearDept,
        String(booking.participants ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(bookingSearchTerm);
    });
  }, [activeBookings, bookingSearchTerm, getFacilityName, getUserEmail]);

  const upcomingBookingsFiltered = useMemo(() => {
    if (!bookingSearchTerm) return upcomingBookings;
    return upcomingBookings.filter((booking) => {
      const haystack = [
        getUserEmail(booking.userId),
        getFacilityName(booking.facilityId),
        booking.purpose,
        booking.status,
        booking.courseYearDept,
        String(booking.participants ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(bookingSearchTerm);
    });
  }, [upcomingBookings, bookingSearchTerm, getFacilityName, getUserEmail]);

  const scheduledBadgeTotal = useMemo(() => {
    if (bookingSearchTerm) return upcomingBookingsFiltered.length;
    const upcomingCount = upcomingBookings.length;
    const pendingCount = pendingBookings.length;
    return upcomingCount + pendingCount;
  }, [bookingSearchTerm, pendingBookings.length, upcomingBookings.length, upcomingBookingsFiltered.length]);

  if (bookingSearchTerm) {
    const activeCount = activeBookingsFiltered.length;
    const scheduledCount = upcomingBookingsFiltered.length;
    if (bookingTab === "active" && activeCount === 0 && scheduledCount > 0) {
      setBookingTab("pendingList");
    } else if (bookingTab === "pendingList" && scheduledCount === 0 && activeCount > 0) {
      setBookingTab("active");
    }
  }

  const renderPurposeButton = (booking: FacilityBooking, idPrefix: string, triggerClass?: string) => {
    if (!booking.purpose) return null;
    const id = `${idPrefix}-${booking.id}`;
    const isOpen = !!openPurpose[id];
    return (
      <Popover open={isOpen} onOpenChange={(value) => setOpenPurpose((prev) => ({ ...prev, [id]: value }))}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  onClick={() => setOpenPurpose((prev) => ({ ...prev, [id]: !prev[id] }))}
                  className={
                    triggerClass || "flex items-center gap-1 text-xs text-pink-600 hover:text-pink-700 transition-colors"
                  }
                  aria-expanded={isOpen}
                >
                  <Eye className="h-3 w-3 text-pink-600" />
                  <span>View purpose</span>
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
              </div>
              <div className="p-3">
                <p className="text-sm text-gray-900 leading-5 break-words text-left">
                  {booking.purpose || "No purpose specified"}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <PopoverContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50">
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
    );
  };

  const renderNeedsBadge = (booking: FacilityBooking) => {
    if (!booking.equipment) return null;
    const status = getNeedsStatusForBooking(booking);
    if (status === "prepared") {
      return (
        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
          Prepared
        </span>
      );
    }
    if (status === "not_available") return null;
    return (
      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        NEEDS
      </span>
    );
  };

  const renderCountBadge = (label: string, value: React.ReactNode, className: string, title?: string) => (
    <div
      className={className}
      title={title}
    >
      {value} {label}
    </div>
  );

  const renderPagination = (
    totalItems: number,
    page: number,
    setPage: Dispatch<SetStateAction<number>>,
  ) => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200">
      <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
        Showing {page * itemsPerPage + 1} to {Math.min((page + 1) * itemsPerPage, totalItems)} of {totalItems} results
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
          disabled={page === 0}
          className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-3 py-1 text-xs sm:text-sm font-medium whitespace-nowrap">
          {page + 1} of {Math.ceil(totalItems / itemsPerPage)}
        </span>
        <button
          onClick={() =>
            setPage((prev) => ((prev + 1) * itemsPerPage < totalItems ? prev + 1 : prev))
          }
          disabled={(page + 1) * itemsPerPage >= totalItems}
          className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col gap-4 mb-4 sm:mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-6">
            <div className="flex-1 min-w-0">
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Facility Booking Management</h2>
                <p className="text-sm sm:text-base text-gray-600">
                  Monitor active bookings, scheduled reservations, and booking history
                </p>
                <AdminSearchBar
                  value={globalFacilityBookingSearch}
                  onChange={(value) => {
                    setGlobalFacilityBookingSearch(value);
                    setActiveBookingsPage(0);
                    setUpcomingBookingsPage(0);
                  }}
                  placeholder="Search bookings..."
                  ariaLabel="Facility bookings search"
                  className="pt-1"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-row flex-wrap gap-2 items-center">
                {renderCountBadge(
                  "Active",
                  bookingSearchTerm
                    ? `${activeBookingsFiltered.length || 0}/${activeBookings.length || 0}`
                    : activeBookings.length || 0,
                  "bg-green-100 text-green-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap text-center",
                  bookingSearchTerm ? `${activeBookingsFiltered.length || 0}/${activeBookings.length || 0}` : undefined,
                )}
                {renderCountBadge(
                  "Scheduled",
                  bookingSearchTerm
                    ? `${upcomingBookingsFiltered.length || 0}/${upcomingBookings.length || 0}`
                    : scheduledBadgeTotal,
                  "bg-pink-100 text-pink-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap text-center",
                  bookingSearchTerm ? `${upcomingBookingsFiltered.length || 0}/${upcomingBookings.length || 0}` : undefined,
                )}
              </div>
              <div className="flex flex-row gap-2">
                <Select
                  value={facilityFilter}
                  onValueChange={(value) => {
                    setFacilityFilter(value);
                    setActiveBookingsPage(0);
                    setUpcomingBookingsPage(0);
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All facilities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All facilities</SelectItem>
                    {facilityOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={toggleFacilitySort}
                  className="inline-flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted"
                  aria-label="Toggle facility sort order"
                >
                  <span className="mr-2">{facilitySort === "asc" ? "A → Z" : "Z → A"}</span>
                  <ArrowUpDown className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={bookingTab} onValueChange={(value) => setBookingTab(value)} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 gap-2">
            <TabsTrigger value="active" className="w-full whitespace-normal flex items-center justify-start md:justify-center gap-2 text-left md:text-center">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span className="truncate">Active Bookings</span>
            </TabsTrigger>
            <TabsTrigger value="pendingList" className="w-full whitespace-normal flex items-center justify-start md:justify-center gap-2 text-left md:text-center">
              <Clock className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span className="truncate">Scheduled</span>
            </TabsTrigger>
          </TabsList>

          {/* Active bookings extracted into component */}
          <TabsContent value="active" className="space-y-4 mt-6 md:mt-0">
            <ActiveBookingsTab
              bookingSearchTerm={bookingSearchTerm}
              activeBookingsFiltered={activeBookingsFiltered}
              activeBookings={activeBookings}
              activeBookingsPage={activeBookingsPage}
              setActiveBookingsPage={setActiveBookingsPage}
              itemsPerPage={itemsPerPage}
              getUserEmail={getUserEmail}
              getFacilityName={getFacilityName}
              formatTime={formatTime}
              formatDate={formatDate}
              renderPurposeButton={renderPurposeButton}
              renderEquipmentLine={renderEquipmentLine}
              isAdmin={isAdmin}
              openEquipmentModal={openEquipmentModal}
              getNeedsStatusForBooking={getNeedsStatusForBooking}
              onArrivalExpire={onArrivalExpire}
              confirmArrivalMutation={confirmArrivalMutation}
              onBookingEndExpire={onBookingEndExpire}
              CountdownComponent={CountdownComponent}
              renderPagination={renderPagination}
            />
          </TabsContent>

          {/* Scheduled bookings extracted into component */}
          <TabsContent value="pendingList" className="space-y-4 mt-6 md:mt-0">
            <ScheduledBookingsTab
              bookingSearchTerm={bookingSearchTerm}
              upcomingBookingsFiltered={upcomingBookingsFiltered}
              upcomingBookings={upcomingBookings}
              upcomingBookingsPage={upcomingBookingsPage}
              setUpcomingBookingsPage={setUpcomingBookingsPage}
              itemsPerPage={itemsPerPage}
              getUserEmail={getUserEmail}
              getFacilityName={getFacilityName}
              formatDateTime={formatDateTime}
              renderPurposeButton={renderPurposeButton}
              renderEquipmentLine={renderEquipmentLine}
              renderNeedsBadge={renderNeedsBadge}
              isAdmin={isAdmin}
              openEquipmentModal={openEquipmentModal}
              getNeedsStatusForBooking={getNeedsStatusForBooking}
              forceActiveBookingMutation={forceActiveBookingMutation}
              renderPagination={renderPagination}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

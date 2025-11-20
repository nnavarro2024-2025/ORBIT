import React, { useState } from "react";
import { Calendar, ArrowUpDown } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { FacilityBooking } from "@shared/schema";
import type { BookingPreviewsProps } from "../../admin/types";
import { EmptyState } from "./EmptyState";

export function BookingPreviews({ upcomingBookings, recentBookings, scheduledCount, facilityFilter, setFacilityFilter, facilitySort, setFacilitySort, facilityOptions, getFacilityName, getUserEmail, formatDateTime, renderStatusBadge, onNavigateToBookingManagement, onNavigateToActivityLogs }: BookingPreviewsProps) {
  const [selectedBooking, setSelectedBooking] = useState<FacilityBooking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleBookingClick = (booking: FacilityBooking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 flex flex-col justify-between">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Scheduled Bookings</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Upcoming approved and auto-scheduled reservations</p>
            </div>
            <div className="bg-pink-100 text-pink-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium self-start whitespace-nowrap">{scheduledCount || 0} scheduled</div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={facilityFilter} onValueChange={setFacilityFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All facilities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All facilities</SelectItem>
                {facilityOptions.map(option => (<SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <button onClick={() => setFacilitySort(prev => (prev === 'asc' ? 'desc' : 'asc'))} className="inline-flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted" aria-label="Toggle facility sort order">
              <span className="mr-2">{facilitySort === 'asc' ? 'A → Z' : 'Z → A'}</span>
              <ArrowUpDown className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        {upcomingBookings && upcomingBookings.length > 0 ? (
          <div className="space-y-3">
            {upcomingBookings.slice(0, 5).map((booking) => (
              <div key={booking.id} onClick={() => handleBookingClick(booking)} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 hover:shadow-sm transition-all duration-200 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{getFacilityName(booking.facilityId)}</h4>
                    <p className="text-sm text-gray-600">{getUserEmail(booking.userId)} • {new Date(booking.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div>{renderStatusBadge(booking.status)}</div>
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-gray-200 flex justify-end">
              <button onClick={() => onNavigateToBookingManagement('pendingList')} className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm hover:bg-pink-700 transition-colors duration-150">View All</button>
            </div>
          </div>
        ) : (
          <EmptyState Icon={Calendar} message="No scheduled bookings" />
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Recent Booking History</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">A quick preview of the most recent booking records</p>
          </div>
          <div className="bg-pink-100 text-pink-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium self-start whitespace-nowrap">{recentBookings?.length || 0} records</div>
        </div>

        {recentBookings && recentBookings.length > 0 ? (
          <div className="space-y-3">
            {recentBookings.slice(0, 5).map((booking: FacilityBooking) => {
              const actionTime = booking.createdAt || booking.startTime;
              let statusLabel = String(booking.status || '').toLowerCase();
              if (statusLabel === 'approved') {
                try { if (new Date(booking.endTime) < new Date()) statusLabel = 'Completed'; else statusLabel = 'Approved'; } catch { statusLabel = 'Approved'; }
              } else if (statusLabel === 'denied') statusLabel = 'Denied';
              else if (statusLabel === 'cancelled' || statusLabel === 'canceled') statusLabel = 'Cancelled';
              else if (statusLabel === 'expired' || statusLabel === 'void') statusLabel = 'Expired';
              else statusLabel = booking.status || 'Unknown';

              return (
                <div key={booking.id} onClick={() => handleBookingClick(booking)} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 hover:shadow-sm transition-all duration-200 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{getFacilityName(booking.facilityId)}</h4>
                      <p className="text-sm text-gray-600">{getUserEmail(booking.userId)} • {formatDateTime(actionTime)}</p>
                    </div>
                    <div>{renderStatusBadge(statusLabel)}</div>
                  </div>
                </div>
              );
            })}
            <div className="pt-4 border-t border-gray-200 flex justify-end">
              <button onClick={() => onNavigateToActivityLogs('history')} className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm hover:bg-pink-700 transition-colors duration-150">View All</button>
            </div>
          </div>
        ) : (
          <EmptyState Icon={Calendar} message="No recent booking activity" />
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">User</h4>
                  <p className="text-sm font-semibold text-gray-900">{getUserEmail(selectedBooking.userId)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                  {renderStatusBadge(selectedBooking.status)}
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Facility</h4>
                <p className="text-sm text-gray-900">{getFacilityName(selectedBooking.facilityId)}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Start Time</h4>
                  <p className="text-sm text-gray-900">{formatDateTime(selectedBooking.startTime)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">End Time</h4>
                  <p className="text-sm text-gray-900">{formatDateTime(selectedBooking.endTime)}</p>
                </div>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Participants</h4>
                <p className="text-sm text-gray-900">{selectedBooking.participants || 0}</p>
              </div>
              {selectedBooking.courseYearDept && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Course/Year/Dept</h4>
                    <p className="text-sm text-gray-900">{selectedBooking.courseYearDept}</p>
                  </div>
                </>
              )}
              {selectedBooking.purpose && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Purpose</h4>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedBooking.purpose}</p>
                  </div>
                </>
              )}
              {selectedBooking.equipment != null && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Equipment</h4>
                    <p className="text-sm text-gray-900">Equipment requested: {JSON.stringify(selectedBooking.equipment)}</p>
                  </div>
                </>
              )}
              {selectedBooking.createdAt && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Created At</h4>
                    <p className="text-sm text-gray-900">{formatDateTime(selectedBooking.createdAt)}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

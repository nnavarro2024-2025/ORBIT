import React, { useState } from 'react';
import { FacilityBooking } from '@shared/schema';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export const BOOKING_MANAGEMENT_TAB_SCHEDULED = 'pendingList' as const;

export type ScheduledBookingsTabProps = {
  bookingSearchTerm: string;
  upcomingBookingsFiltered: FacilityBooking[];
  upcomingBookings: FacilityBooking[];
  upcomingBookingsPage: number;
  setUpcomingBookingsPage: React.Dispatch<React.SetStateAction<number>>;
  itemsPerPage: number;
  getUserEmail: (id: FacilityBooking['userId']) => string;
  getFacilityName: (id: FacilityBooking['facilityId']) => string;
  formatDateTime: (value: FacilityBooking['startTime']) => string;
  renderPurposeButton: (booking: FacilityBooking, idPrefix: string, triggerClass?: string) => React.ReactNode;
  renderEquipmentLine: (booking: FacilityBooking) => React.ReactNode;
  renderNeedsBadge: (booking: FacilityBooking) => React.ReactNode;
  isAdmin: boolean;
  openEquipmentModal: (booking: FacilityBooking) => void;
  getNeedsStatusForBooking: (booking: FacilityBooking) => 'prepared' | 'not_available' | undefined;
  forceActiveBookingMutation: { mutate: (booking: FacilityBooking) => void; isPending: boolean };
  renderPagination: (totalItems: number, page: number, setPage: React.Dispatch<React.SetStateAction<number>>) => React.ReactNode;
};

export function ScheduledBookingsTab(props: ScheduledBookingsTabProps) {
  const {
    bookingSearchTerm,
    upcomingBookingsFiltered,
    upcomingBookings,
    upcomingBookingsPage,
    setUpcomingBookingsPage,
    itemsPerPage,
    getUserEmail,
    getFacilityName,
    formatDateTime,
    renderPurposeButton,
    renderEquipmentLine,
    renderNeedsBadge,
    isAdmin,
    openEquipmentModal,
    getNeedsStatusForBooking,
    forceActiveBookingMutation,
    renderPagination,
  } = props;

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
    <div className="bg-gray-50 rounded-lg p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Scheduled Facility Bookings</h3>
        <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
          {bookingSearchTerm
            ? `${upcomingBookingsFiltered.length || 0}/${upcomingBookings.length || 0}`
            : `${upcomingBookingsFiltered.length || 0}`} bookings
        </span>
      </div>
      {upcomingBookings.length > 0 ? (
        <div className="space-y-3">
          {upcomingBookingsFiltered
            .slice(upcomingBookingsPage * itemsPerPage, (upcomingBookingsPage + 1) * itemsPerPage)
            .map((booking) => (
              <div key={booking.id} onClick={() => handleBookingClick(booking)} className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 hover:border-pink-200 hover:shadow-sm transition-all duration-200 cursor-pointer">
                {/* Mobile layout */}
                <div className="flex flex-col gap-3 md:hidden">
                  <div className="flex items-start gap-3">
                    <div className="bg-pink-100 p-2 rounded-lg flex-shrink-0">
                      <Clock className="h-5 w-5 text-pink-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm break-words">{getUserEmail(booking.userId)}</h4>
                      <p className="text-xs text-gray-600 mt-0.5 break-words">{getFacilityName(booking.facilityId)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-11">
                    <span className="text-xs font-medium text-gray-500">Participants:</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {booking.participants || 0}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-11">
                    <div>
                      <p className="text-xs font-medium text-gray-900">Starts</p>
                      <p className="text-xs text-gray-600 mt-0.5">{formatDateTime(booking.startTime)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900">Ends</p>
                      <p className="text-xs text-gray-600 mt-0.5">{formatDateTime(booking.endTime)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-11">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">Scheduled</span>
                    {renderNeedsBadge(booking)}
                  </div>
                  {booking.purpose && <div className="pl-11">{renderPurposeButton(booking, 'scheduled-mobile')}</div>}
                  {(booking.status === 'approved' || String(booking.status).toLowerCase() === 'pending') && new Date(booking.startTime) > new Date() && (
                    <div className="pl-11 space-y-2">
                      {renderEquipmentLine(booking)}
                      {isAdmin && !!booking.equipment && !getNeedsStatusForBooking(booking) && (
                        <Button size="sm" onClick={() => openEquipmentModal(booking)} aria-label={`Check equipment for ${booking.id}`} className="w-full text-xs">
                          🔎 Check Equipment
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => forceActiveBookingMutation.mutate(booking)}
                          disabled={forceActiveBookingMutation.isPending}
                          className="w-full bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700 text-xs"
                          aria-label={`Force booking ${booking.id} to active`}
                        >
                          ⚡ Force Active (Test)
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {/* Desktop layout */}
                <div className="hidden md:flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-pink-100 p-2 rounded-lg">
                      <Clock className="h-5 w-5 text-pink-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{getUserEmail(booking.userId)}</h4>
                      <p className="text-sm text-gray-600">{getFacilityName(booking.facilityId)}</p>
                      {booking.courseYearDept && (
                        <p className="text-xs text-blue-700 mt-0.5 break-words font-semibold">
                          <span className="text-[10px] text-gray-500 mr-1">Course/Year/Dept:</span>
                          {booking.courseYearDept}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium text-gray-500">Participants:</span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {booking.participants || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      {renderPurposeButton(
                        booking,
                        'scheduled-desktop',
                        'flex items-center gap-1 cursor-help justify-end text-xs text-pink-600 hover:text-pink-700 transition-colors'
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">Starts</p>
                      <p className="text-sm text-gray-600">{formatDateTime(booking.startTime)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">Ends</p>
                      <p className="text-sm text-gray-600">{formatDateTime(booking.endTime)}</p>
                    </div>
                    <div className="inline-grid gap-2 justify-items-stretch items-start">
                      <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
                        <span className="w-full md:w-auto inline-flex items-center justify-center h-6 min-w-[96px] px-3 rounded-full text-xs font-medium bg-pink-100 text-pink-800">Scheduled</span>
                        {renderNeedsBadge(booking)}
                      </div>
                      <div className="ml-0 md:ml-4">
                        {(booking.status === 'approved' || String(booking.status).toLowerCase() === 'pending') && new Date(booking.startTime) > new Date() && renderEquipmentLine(booking)}
                        {isAdmin && !!booking.equipment && (booking.status === 'approved' || String(booking.status).toLowerCase() === 'pending') && new Date(booking.startTime) > new Date() && !getNeedsStatusForBooking(booking) && (
                          <div className="flex items-center gap-2 mt-2">
                            <Button size="sm" onClick={() => openEquipmentModal(booking)} aria-label={`Check equipment for ${booking.id}`}>
                              🔎 Check Equipment
                            </Button>
                          </div>
                        )}
                        {isAdmin && new Date(booking.startTime) > new Date() && (
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => forceActiveBookingMutation.mutate(booking)}
                              disabled={forceActiveBookingMutation.isPending}
                              className="bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700"
                              aria-label={`Force booking ${booking.id} to active`}
                            >
                              ⚡ Force Active (Test)
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          {upcomingBookingsFiltered.length > itemsPerPage && renderPagination(upcomingBookingsFiltered.length, upcomingBookingsPage, setUpcomingBookingsPage)}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
            <Clock className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-600 text-sm">No upcoming facility bookings</p>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scheduled Booking Details</DialogTitle>
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
                  <Badge className="bg-pink-100 text-pink-800">Scheduled</Badge>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

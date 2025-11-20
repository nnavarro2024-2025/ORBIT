import React, { useState } from 'react';
import { FacilityBooking } from '@shared/schema';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export const BOOKING_MANAGEMENT_TAB_ACTIVE = 'active' as const;

export type ActiveBookingsTabProps = {
  bookingSearchTerm: string;
  activeBookingsFiltered: FacilityBooking[];
  activeBookings: FacilityBooking[];
  activeBookingsPage: number;
  setActiveBookingsPage: React.Dispatch<React.SetStateAction<number>>;
  itemsPerPage: number;
  getUserEmail: (id: FacilityBooking['userId']) => string;
  getFacilityName: (id: FacilityBooking['facilityId']) => string;
  formatTime: (value: FacilityBooking['startTime']) => string;
  formatDate: (value: FacilityBooking['startTime']) => string;
  renderPurposeButton: (booking: FacilityBooking, idPrefix: string, triggerClass?: string) => React.ReactNode;
  renderEquipmentLine: (booking: FacilityBooking) => React.ReactNode;
  isAdmin: boolean;
  openEquipmentModal: (booking: FacilityBooking) => void;
  getNeedsStatusForBooking: (booking: FacilityBooking) => 'prepared' | 'not_available' | undefined;
  onArrivalExpire: (booking: FacilityBooking) => void;
  confirmArrivalMutation: { mutate: (arg: { bookingId: FacilityBooking['id'] }) => void; isPending: boolean };
  onBookingEndExpire: (booking: FacilityBooking) => void;
  CountdownComponent: (props: { expiry: string | Date | undefined; onExpire?: () => void }) => React.ReactNode;
  renderPagination: (totalItems: number, page: number, setPage: React.Dispatch<React.SetStateAction<number>>) => React.ReactNode;
};

export function ActiveBookingsTab(props: ActiveBookingsTabProps) {
  const {
    bookingSearchTerm,
    activeBookingsFiltered,
    activeBookings,
    activeBookingsPage,
    setActiveBookingsPage,
    itemsPerPage,
    getUserEmail,
    getFacilityName,
    formatTime,
    formatDate,
    renderPurposeButton,
    renderEquipmentLine,
    isAdmin,
    openEquipmentModal,
    getNeedsStatusForBooking,
    onArrivalExpire,
    confirmArrivalMutation,
    onBookingEndExpire,
    CountdownComponent,
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
    <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mt-4 md:mt-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Currently Active Facility Bookings</h3>
        <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
          {bookingSearchTerm
            ? `${activeBookingsFiltered.length || 0}/${activeBookings.length || 0}`
            : `${activeBookingsFiltered.length || 0}`} bookings
        </span>
      </div>
      {activeBookings.length > 0 ? (
        <div className="space-y-3">
          {activeBookingsFiltered
            .slice(activeBookingsPage * itemsPerPage, (activeBookingsPage + 1) * itemsPerPage)
            .map((booking) => (
              <div key={booking.id} onClick={() => handleBookingClick(booking)} className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 hover:border-green-300 hover:shadow-sm transition-all duration-200 cursor-pointer">
                {/* Mobile layout */}
                <div className="flex flex-col gap-3 md:hidden">
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 p-2 rounded-lg flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 break-words">{getUserEmail(booking.userId)}</h4>
                      <p className="text-xs text-gray-600 mt-0.5 break-words">{getFacilityName(booking.facilityId)}</p>
                      {booking.courseYearDept && (
                        <p className="text-xs text-blue-700 mt-0.5 break-words font-semibold">
                          <span className="text-[10px] text-gray-500 mr-1">Course/Year/Dept:</span>
                          {booking.courseYearDept}
                        </p>
                      )}
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap flex-shrink-0">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pl-11">
                    <span className="text-xs font-medium text-gray-500">Participants:</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {booking.participants || 0}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-11">
                    <div>
                      <p className="text-xs font-medium text-gray-900">Started</p>
                      <p className="text-xs text-gray-600 mt-0.5">{formatTime(booking.startTime)}</p>
                      <p className="text-xs text-gray-500">{formatDate(booking.startTime)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900">Ends</p>
                      <p className="text-xs text-gray-600 mt-0.5">{formatTime(booking.endTime)}</p>
                      <p className="text-xs text-gray-500">{formatDate(booking.endTime)}</p>
                    </div>
                  </div>
                  {(booking.purpose || booking.courseYearDept) && (
                    <div className="pl-11">{renderPurposeButton(booking, 'active-mobile')}</div>
                  )}
                  {(booking.status === 'approved' || String(booking.status).toLowerCase() === 'pending') && (
                    <div className="pl-11">
                      {renderEquipmentLine(booking)}
                      {isAdmin && !!booking.equipment && new Date(booking.startTime) > new Date() && !getNeedsStatusForBooking(booking) && (
                        <Button size="sm" onClick={() => openEquipmentModal(booking)} aria-label={`Check equipment for ${booking.id}`} className="w-full mt-2 text-xs">
                          🔎 Check Equipment
                        </Button>
                      )}
                    </div>
                  )}
                  {(booking.status === 'approved' || String(booking.status).toLowerCase() === 'pending') && (
                    <div className="pl-11">
                      {booking.arrivalConfirmationDeadline && !booking.arrivalConfirmed ? (
                        <div className="flex flex-col gap-2">
                          <div className="text-xs text-gray-500">Confirmation required in:</div>
                          <CountdownComponent expiry={booking.arrivalConfirmationDeadline} onExpire={() => onArrivalExpire(booking)} />
                          <Button
                            onClick={() => confirmArrivalMutation.mutate({ bookingId: booking.id })}
                            variant="outline"
                            size="sm"
                            disabled={confirmArrivalMutation.isPending}
                            aria-label={`Confirm arrival for booking ${booking.id}`}
                            className="w-full text-xs"
                          >
                            {confirmArrivalMutation.isPending ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Confirming...
                              </span>
                            ) : (
                              'Confirm Arrival'
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="text-xs font-medium text-gray-500">Time remaining</div>
                          <div className="px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                            <CountdownComponent expiry={booking.endTime} onExpire={() => onBookingEndExpire(booking)} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* Desktop layout */}
                <div className="hidden md:flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
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
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 w-full md:w-auto md:flex-1 md:justify-end">
                    {booking.purpose && (
                      <div className="text-right">
                        {renderPurposeButton(
                          booking,
                          'active-desktop',
                          'flex items-center gap-1 cursor-help text-xs text-pink-600 hover:text-pink-700 transition-colors'
                        )}
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">Started</p>
                      <p className="text-xs text-gray-600">{formatTime(booking.startTime)}</p>
                      <p className="text-xs text-gray-500">{formatDate(booking.startTime)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">Ends</p>
                      <p className="text-xs text-gray-600">{formatTime(booking.endTime)}</p>
                      <p className="text-xs text-gray-500">{formatDate(booking.endTime)}</p>
                    </div>
                    <div className="flex items-center">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                    </div>
                    <div className="text-right">
                      {(booking.status === 'approved' || String(booking.status).toLowerCase() === 'pending') && renderEquipmentLine(booking)}
                      {isAdmin && !!booking.equipment && (booking.status === 'approved' || String(booking.status).toLowerCase() === 'pending') && new Date(booking.startTime) > new Date() && !getNeedsStatusForBooking(booking) && (
                        <div className="flex items-center gap-2 mt-2">
                          <Button size="sm" onClick={() => openEquipmentModal(booking)} aria-label={`Check equipment for ${booking.id}`}>
                            🔎 Check Equipment
                          </Button>
                        </div>
                      )}
                    </div>
                    {(booking.status === 'approved' || String(booking.status).toLowerCase() === 'pending') && (
                      <div className="text-right">
                        {booking.arrivalConfirmationDeadline && !booking.arrivalConfirmed ? (
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-xs text-gray-500">Confirmation required in:</div>
                            <CountdownComponent expiry={booking.arrivalConfirmationDeadline} onExpire={() => onArrivalExpire(booking)} />
                            <Button
                              onClick={() => confirmArrivalMutation.mutate({ bookingId: booking.id })}
                              variant="outline"
                              size="sm"
                              disabled={confirmArrivalMutation.isPending}
                              aria-label={`Confirm arrival for booking ${booking.id}`}
                            >
                              {confirmArrivalMutation.isPending ? (
                                <span className="flex items-center gap-2">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Confirming...
                                </span>
                              ) : (
                                'Confirm Arrival'
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 items-end">
                            <div className="text-xs font-medium text-gray-500">Time remaining</div>
                            <div className="px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                              <CountdownComponent expiry={booking.endTime} onExpire={() => onBookingEndExpire(booking)} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          {activeBookingsFiltered.length > itemsPerPage && renderPagination(activeBookingsFiltered.length, activeBookingsPage, setActiveBookingsPage)}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-600 text-sm">No active facility bookings</p>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Active Booking Details</DialogTitle>
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
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
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
                  <p className="text-sm text-gray-900">{formatTime(selectedBooking.startTime)}</p>
                  <p className="text-xs text-gray-500">{formatDate(selectedBooking.startTime)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">End Time</h4>
                  <p className="text-sm text-gray-900">{formatTime(selectedBooking.endTime)}</p>
                  <p className="text-xs text-gray-500">{formatDate(selectedBooking.endTime)}</p>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

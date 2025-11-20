import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CheckCircle, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { EmptyState } from '../../../common/EmptyState';
import type { FacilityBooking } from '@shared/schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export const ADMIN_ACTIVITY_LOGS_TAB_SUCCESS = 'success' as const;

type Setter<T> = (value: T | ((prev: T) => T)) => void;

export type SuccessTabProps = {
  filteredSuccessfullyBooked: FacilityBooking[];
  successPage: number;
  setSuccessPage: Setter<number>;
  itemsPerPage: number;
  openPurpose: Record<string, boolean>;
  setOpenPurpose: Setter<Record<string, boolean>>;
  getUserEmail: (id: string) => string;
  getFacilityName: (id: string | number) => string;
  formatDateTime: (d: Date | string | number) => string;
  statusClass: (statusRaw: any) => string;
};

export function SuccessTab({
  filteredSuccessfullyBooked,
  successPage,
  setSuccessPage,
  itemsPerPage,
  openPurpose,
  setOpenPurpose,
  getUserEmail,
  getFacilityName,
  formatDateTime,
  statusClass,
}: SuccessTabProps) {
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
    <div className="bg-gray-50 rounded-lg p-6 mt-0">
      <h3 className="text-lg font-semibold text-gray-900">Successfully Booked</h3>
      <p className="text-sm text-gray-600 mt-1">Completed bookings which were approved and had confirmed arrival.</p>
      {filteredSuccessfullyBooked.length > 0 ? (
        <>
          <div className="space-y-2 mt-3">
            {filteredSuccessfullyBooked
              .slice(successPage * itemsPerPage, (successPage + 1) * itemsPerPage)
              .map((b: FacilityBooking) => (
                <div 
                  key={b.id} 
                  className="bg-white rounded-md p-3 border border-gray-200 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all duration-200"
                  onClick={() => handleBookingClick(b)}
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900">{getUserEmail(b.userId)}</h4>
                      <p className="text-xs text-gray-600">{getFacilityName(b.facilityId)}</p>
                      <p className="text-xs text-gray-500 mt-1">Participants: <span className="text-xs text-gray-700">{b.participants || 0}</span></p>
                    </div>

                    <div className="w-full md:flex-1 flex flex-col md:flex-row items-start md:items-center min-w-0">
                      <div className="w-full md:flex-1 flex items-center justify-start md:justify-end gap-2 text-xs text-gray-500 min-w-0">
                        <span className="text-xs text-gray-500">Purpose:</span>
                        {b.purpose ? (() => {
                          const id = `purpose-${b.id}`;
                          const isOpen = !!openPurpose[id];
                          return (
                            <Popover open={isOpen} onOpenChange={(v) => setOpenPurpose((prev) => ({ ...prev, [id]: v }))}>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <PopoverTrigger asChild>
                                      <button
                                        onClick={() => setOpenPurpose((prev) => ({ ...prev, [id]: !prev[id] }))}
                                        className="flex items-center gap-1 cursor-help text-xs text-pink-600"
                                        aria-expanded={isOpen}
                                      >
                                        <Eye className="h-3 w-3 text-pink-600" />
                                        <span>View</span>
                                      </button>
                                    </PopoverTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                      <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                    </div>
                                    <div className="p-3">
                                      <p className="text-sm text-gray-900 leading-5 break-words text-left">{b.purpose}</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <PopoverContent side="top" align="end" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50">
                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                  <p className="font-semibold text-sm text-gray-800 text-left">Purpose</p>
                                </div>
                                <div className="p-3">
                                  <p className="text-sm text-gray-900 leading-5 break-words text-left">{b.purpose}</p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          );
                        })() : null}
                        <span className="text-xs text-gray-400 whitespace-nowrap">|</span>
                        <span className="text-xs text-gray-500 whitespace-nowrap">Starts:</span>
                        <span className="text-xs text-gray-900 whitespace-nowrap">{formatDateTime(b.startTime)}</span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">|</span>
                        <span className="text-xs text-gray-500 whitespace-nowrap">Ends:</span>
                        <span className="text-xs text-gray-900 whitespace-nowrap">{formatDateTime(b.endTime)}</span>
                      </div>
                      <div className="w-full md:w-36 text-right mt-2 md:mt-0 md:ml-4 flex items-center justify-end gap-2 md:whitespace-nowrap">
                        <span className="text-xs text-gray-400">|</span>
                        <span className={`text-xs font-medium ${statusClass(b.status)} capitalize`}>Status: {String(b.status || '')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {filteredSuccessfullyBooked.length > itemsPerPage && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing {successPage * itemsPerPage + 1} to {Math.min((successPage + 1) * itemsPerPage, filteredSuccessfullyBooked.length)} of {filteredSuccessfullyBooked.length} results
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSuccessPage((prev) => Math.max(Number(prev) - 1, 0))}
                  disabled={successPage === 0}
                  className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 py-1 text-sm font-medium">
                  {successPage + 1} of {Math.ceil(filteredSuccessfullyBooked.length / itemsPerPage)}
                </span>
                <button
                  onClick={() => setSuccessPage((prev) => (filteredSuccessfullyBooked && (Number(prev) + 1) * itemsPerPage < filteredSuccessfullyBooked.length ? Number(prev) + 1 : Number(prev)))}
                  disabled={!filteredSuccessfullyBooked || (successPage + 1) * itemsPerPage >= filteredSuccessfullyBooked.length}
                  className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyState Icon={CheckCircle} message="No successful bookings found" />
      )}

      {/* Booking Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Booking Details</DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6 pt-4">
              {/* Status */}
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Status</h3>
                <Badge variant="default" className="text-sm px-3 py-1">
                  {selectedBooking.status}
                </Badge>
              </div>

              <Separator />

              {/* User */}
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">User</h3>
                <p className="text-base">{getUserEmail(selectedBooking.userId)}</p>
              </div>

              <Separator />

              {/* Facility */}
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Facility</h3>
                <p className="text-base">{getFacilityName(selectedBooking.facilityId)}</p>
              </div>

              <Separator />

              {/* Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">Start Time</h3>
                  <p className="text-base">{formatDateTime(selectedBooking.startTime)}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">End Time</h3>
                  <p className="text-base">{formatDateTime(selectedBooking.endTime)}</p>
                </div>
              </div>

              <Separator />

              {/* Purpose */}
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Purpose</h3>
                <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
                  {selectedBooking.purpose || 'No purpose specified'}
                </p>
              </div>

              <Separator />

              {/* Participants */}
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Participants</h3>
                <p className="text-base">{selectedBooking.participants || 0}</p>
              </div>

              {/* Course/Year/Dept */}
              {selectedBooking.courseYearDept && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Course/Year/Department</h3>
                    <p className="text-base">{selectedBooking.courseYearDept}</p>
                  </div>
                </>
              )}

              {/* Arrival Confirmed */}
              {selectedBooking.arrivalConfirmed && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Arrival Status</h3>
                    <Badge variant="default">Confirmed</Badge>
                  </div>
                </>
              )}

              <Separator />

              {/* Booking ID */}
              <div className="pt-2">
                <p className="text-xs text-muted-foreground">
                  Booking ID: <span className="font-mono">{selectedBooking.id}</span>
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

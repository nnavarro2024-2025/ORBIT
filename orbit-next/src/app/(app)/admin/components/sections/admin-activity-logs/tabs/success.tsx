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
          <div className="space-y-3 mt-3">
            {filteredSuccessfullyBooked
              .slice(successPage * itemsPerPage, (successPage + 1) * itemsPerPage)
              .map((b: FacilityBooking) => {
                const equipment: any = b.equipment || {};
                const items = Array.isArray(equipment.items) ? equipment.items : [];
                const hasOthers = equipment.others && String(equipment.others).trim().length > 0;

                return (
                <div 
                  key={b.id} 
                  className="bg-white rounded-lg p-4 border border-gray-200 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200"
                  onClick={() => handleBookingClick(b)}
                >
                  {/* Mobile Layout */}
                  <div className="lg:hidden space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-gray-900 mb-1 break-words">{getUserEmail(b.userId)}</h4>
                        <p className="text-xs text-gray-600 mb-2">{getFacilityName(b.facilityId)}</p>
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">
                            <svg className="h-3 w-3 text-gray-600" viewBox="0 0 8 8" fill="currentColor">
                              <circle cx="4" cy="4" r="4" />
                            </svg>
                            {b.participants || 0}
                          </span>
                          {b.courseYearDept && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                              {b.courseYearDept}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs font-semibold ${statusClass(b.status)} capitalize px-3 py-1.5 rounded-full flex-shrink-0`}>
                        {String(b.status || '')}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {b.purpose && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 font-medium">Purpose:</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="flex items-center gap-1 text-pink-600 hover:text-pink-700" onClick={(e) => e.stopPropagation()}>
                                <Eye className="h-3 w-3" />
                                <span className="text-xs">View</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50">
                              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                <p className="font-semibold text-sm text-gray-800">Purpose</p>
                              </div>
                              <div className="p-3 max-h-48 overflow-y-auto">
                                <p className="text-sm text-gray-900 leading-5 break-words">{b.purpose}</p>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Starts:</span>
                          <p className="text-gray-900 font-medium">{formatDateTime(b.startTime)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Ends:</span>
                          <p className="text-gray-900 font-medium">{formatDateTime(b.endTime)}</p>
                        </div>
                      </div>
                      
                      {items.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                          <span className="text-xs font-medium text-gray-500 block mb-1">Equipment</span>
                          <div className="space-y-1 max-h-24 overflow-y-auto">
                            {items.slice(0, 3).map((item: string, idx: number) => {
                              let statusValue = 'pending';
                              try {
                                const resp = String(b?.adminResponse || '');
                                const jsonMatch = resp.match(/\{"items":\{[^}]*\}\}/);
                                if (jsonMatch) {
                                  const parsed = JSON.parse(jsonMatch[0]);
                                  if (parsed.items && typeof parsed.items === 'object') {
                                    const itemKey = String(item).toLowerCase().replace(/\s+/g, '_');
                                    for (const [key, value] of Object.entries(parsed.items)) {
                                      const normalizedKey = String(key).toLowerCase().replace(/\s+/g, '_');
                                      if (normalizedKey === itemKey || String(key).toLowerCase() === String(item).toLowerCase()) {
                                        statusValue = String(value);
                                        break;
                                      }
                                    }
                                  }
                                }
                              } catch {}

                              return (
                                <div key={`eq-mob-${b.id}-${idx}`} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-700 truncate">{item}</span>
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ml-2 ${
                                    statusValue === 'prepared' ? 'bg-green-100 text-green-700' :
                                    statusValue === 'not_available' || statusValue === 'not available' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {statusValue === 'not_available' ? 'N/A' : statusValue}
                                  </span>
                                </div>
                              );
                            })}
                            {items.length > 3 && (
                              <p className="text-xs text-pink-600 font-medium">+{items.length - 3} more (tap to view)</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden lg:grid lg:grid-cols-10 lg:gap-4">
                    {/* Left Column - User Info */}
                    <div className="lg:col-span-2">
                      <h4 className="font-semibold text-sm text-gray-900 mb-1">{getUserEmail(b.userId)}</h4>
                      <p className="text-xs text-gray-600 mb-2">{getFacilityName(b.facilityId)}</p>
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">
                          <svg className="h-3 w-3 text-gray-600" viewBox="0 0 8 8" fill="currentColor">
                            <circle cx="4" cy="4" r="4" />
                          </svg>
                          {b.participants || 0}
                        </span>
                        {b.courseYearDept && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                            </svg>
                            {b.courseYearDept}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Column - Time & Purpose */}
                    <div className="lg:col-span-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 font-medium">Purpose:</span>
                          {b.purpose ? (
                            <Popover>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <PopoverTrigger asChild>
                                      <button className="flex items-center gap-1 cursor-help text-pink-600 hover:text-pink-700">
                                        <Eye className="h-3 w-3" />
                                        <span className="text-xs">View</span>
                                      </button>
                                    </PopoverTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                      <p className="font-semibold text-sm text-gray-800">Purpose</p>
                                    </div>
                                    <div className="p-3 max-h-48 overflow-y-auto">
                                      <p className="text-sm text-gray-900 leading-5 break-words">{b.purpose}</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <PopoverContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50">
                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                  <p className="font-semibold text-sm text-gray-800">Purpose</p>
                                </div>
                                <div className="p-3 max-h-48 overflow-y-auto">
                                  <p className="text-sm text-gray-900 leading-5 break-words">{b.purpose}</p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Starts:</span>
                            <p className="text-gray-900 font-medium">{formatDateTime(b.startTime)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Ends:</span>
                            <p className="text-gray-900 font-medium">{formatDateTime(b.endTime)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Equipment Column */}
                    <div className="lg:col-span-3">
                      {items.length > 0 ? (
                        <div className="bg-white rounded-lg p-2.5 border border-gray-200 h-[120px] flex flex-col">
                          <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
                            <span className="text-xs font-medium text-gray-500">Equipment or Needs</span>
                          </div>
                          <div className="space-y-1 overflow-y-auto flex-1">
                            {items.map((item: string, idx: number) => {
                              let statusValue = 'pending';
                              try {
                                const resp = String(b?.adminResponse || '');
                                const jsonMatch = resp.match(/\{"items":\{[^}]*\}\}/);
                                if (jsonMatch) {
                                  const parsed = JSON.parse(jsonMatch[0]);
                                  if (parsed.items && typeof parsed.items === 'object') {
                                    const itemKey = String(item).toLowerCase().replace(/\s+/g, '_');
                                    for (const [key, value] of Object.entries(parsed.items)) {
                                      const normalizedKey = String(key).toLowerCase().replace(/\s+/g, '_');
                                      if (normalizedKey === itemKey || String(key).toLowerCase() === String(item).toLowerCase()) {
                                        statusValue = String(value);
                                        break;
                                      }
                                    }
                                  }
                                }
                              } catch {}

                              return (
                                <div key={`eq-${b.id}-${idx}`} className="flex items-center justify-between py-0.5">
                                  <span className="text-xs text-gray-700">{item}</span>
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                    statusValue === 'prepared' ? 'bg-green-100 text-green-700' :
                                    statusValue === 'not_available' || statusValue === 'not available' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {statusValue === 'not_available' ? 'not available' : statusValue}
                                  </span>
                                </div>
                              );
                            })}
                            {hasOthers && (() => {
                              let otherStatusValue = 'pending';
                              try {
                                const resp = String(b?.adminResponse || '');
                                const jsonMatch = resp.match(/\{"items":\{[^}]*\}\}/);
                                if (jsonMatch) {
                                  const parsed = JSON.parse(jsonMatch[0]);
                                  if (parsed.items && typeof parsed.items === 'object') {
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
                                <div className="flex items-center justify-between py-0.5">
                                  <Popover>
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
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                    otherStatusValue === 'prepared' ? 'bg-green-100 text-green-700' :
                                    otherStatusValue === 'not_available' || otherStatusValue === 'not available' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {otherStatusValue === 'not_available' ? 'not available' : otherStatusValue}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white rounded-lg p-2.5 border border-gray-200 h-[120px] flex items-center justify-center">
                          <p className="text-xs text-gray-500">No equipment</p>
                        </div>
                      )}
                    </div>

                    {/* Status Column */}
                    <div className="lg:col-span-2 flex items-center justify-end">
                      <span className={`text-xs font-semibold ${statusClass(b.status)} capitalize px-3 py-1.5 rounded-full`}>
                        {String(b.status || '')}
                      </span>
                    </div>
                  </div>
                </div>
                );
              })}
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

              {/* Equipment Status */}
              {(() => {
                const eq: any = selectedBooking.equipment || {};
                const eqItems = Array.isArray(eq.items) ? eq.items : [];
                if (eqItems.length > 0) {
                  return (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Equipment Status</h3>
                        <div className="space-y-2">
                          {eqItems.map((item: string, idx: number) => {
                            let statusValue = 'pending';
                            try {
                              const resp = String(selectedBooking?.adminResponse || '');
                              const jsonMatch = resp.match(/\{"items":\{[^}]*\}\}/);
                              if (jsonMatch) {
                                const parsed = JSON.parse(jsonMatch[0]);
                                if (parsed.items && typeof parsed.items === 'object') {
                                  const itemKey = String(item).toLowerCase().replace(/\s+/g, '_');
                                  for (const [key, value] of Object.entries(parsed.items)) {
                                    const normalizedKey = String(key).toLowerCase().replace(/\s+/g, '_');
                                    if (normalizedKey === itemKey || String(key).toLowerCase() === String(item).toLowerCase()) {
                                      statusValue = String(value);
                                      break;
                                    }
                                  }
                                }
                              }
                            } catch {}

                            return (
                              <div key={`modal-eq-${idx}`} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                                <span className="text-sm text-gray-900 font-medium">{item}</span>
                                <Badge variant={
                                  statusValue === 'prepared' ? 'default' :
                                  statusValue === 'not_available' || statusValue === 'not available' ? 'destructive' :
                                  'secondary'
                                }>
                                  {statusValue === 'not_available' ? 'not available' : statusValue}
                                </Badge>
                              </div>
                            );
                          })}
                          {eq.others && String(eq.others).trim().length > 0 && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-xs font-semibold text-blue-900 mb-1">Additional Notes:</p>
                              <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap break-words">
                                {String(eq.others).trim()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  );
                }
                return null;
              })()}

              {/* Admin Notes - Only show if there's non-JSON text */}
              {(() => {
                const resp = String(selectedBooking.adminResponse || '');
                const withoutJson = resp.replace(/\{"items":\{[^}]*\}\}/, '').trim();
                const cleanResp = withoutJson.replace(/^Needs:\s*(Not Available|Available)\s*—\s*/, '').trim();
                
                if (cleanResp.length > 0) {
                  return (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Admin Notes</h3>
                        <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
                          {cleanResp}
                        </p>
                      </div>
                    </>
                  );
                }
                return null;
              })()}

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

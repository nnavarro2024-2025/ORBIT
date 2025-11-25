import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { BarChart3, ChevronLeft, ChevronRight, Eye, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { EmptyState } from '../../../common/EmptyState';
import type { FacilityBooking } from '@shared/schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export const ADMIN_ACTIVITY_LOGS_TAB_HISTORY = 'history' as const;

type Setter<T> = (value: T | ((prev: T) => T)) => void;

export type HistoryTabProps = {
  filteredBookingHistory: FacilityBooking[];
  historyPage: number;
  setHistoryPage: Setter<number>;
  itemsPerPage: number;
  openPurpose: Record<string, boolean>;
  setOpenPurpose: Setter<Record<string, boolean>>;
  getUserEmail: (id: string) => string;
  getFacilityName: (id: string | number) => string;
  formatDateTime: (d: Date | string | number) => string;
  statusClass: (status: any) => string;
};

export function HistoryTab({
  filteredBookingHistory,
  historyPage,
  setHistoryPage,
  itemsPerPage,
  openPurpose,
  setOpenPurpose,
  getUserEmail,
  getFacilityName,
  formatDateTime,
  statusClass,
}: HistoryTabProps) {
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

  if (filteredBookingHistory.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 mt-0">
        <h3 className="text-lg font-semibold text-gray-900">Booking History</h3>
        <p className="text-sm text-gray-600 mt-1">Past bookings including denied, cancelled or expired reservations for audit purposes.</p>
        <EmptyState Icon={BarChart3} message="No booking history records" />
      </div>
    );
  }
  const pageItems = filteredBookingHistory.slice(historyPage * itemsPerPage, (historyPage + 1) * itemsPerPage);
  return (
    <div className="bg-gray-50 rounded-lg p-6 mt-0">
      <h3 className="text-lg font-semibold text-gray-900">Booking History</h3>
      <p className="text-sm text-gray-600 mt-1">Past bookings including denied, cancelled or expired reservations for audit purposes.</p>
      <div className="space-y-3 mt-3">
        {pageItems.map((b: FacilityBooking) => {
          const equipment: any = b.equipment || {};
          const items = Array.isArray(equipment.items) ? equipment.items : [];
          const hasOthers = equipment.others && String(equipment.others).trim().length > 0;

          return (
            <div
              key={b.id}
              className="bg-white rounded-lg p-4 border border-gray-200 hover:border-pink-200 hover:shadow-sm transition-all duration-200 cursor-pointer"
              onClick={() => handleBookingClick(b)}
            >
              {/* Mobile layout */}
              <div className="lg:hidden space-y-3">
                <div className="flex items-start gap-2">
                  <div className="bg-gray-100 p-2 rounded-lg flex-shrink-0">
                    <Calendar className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm break-words">{getFacilityName(b.facilityId)}</h4>
                    {b.courseYearDept && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        <span className="font-medium">Course/Year/Dept:</span> <span className="text-blue-700 font-semibold">{b.courseYearDept}</span>
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">User:</span>
                    <span className="text-gray-700 font-medium truncate">{getUserEmail(b.userId)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Participants:</span>
                    <span className="px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-800">{b.participants || 0}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <p className="text-xs font-medium text-gray-500">Started</p>
                      <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">{format(new Date(b.startTime), "h:mm a")}</p>
                      <p className="text-xs text-gray-500">{format(new Date(b.startTime), "M/d/yyyy")}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-medium text-gray-500">Ends</p>
                      <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">{format(new Date(b.endTime), "h:mm a")}</p>
                      <p className="text-xs text-gray-500">{format(new Date(b.endTime), "M/d/yyyy")}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold ${statusClass(b.status)} capitalize px-3 py-1.5 rounded-full flex-shrink-0`}>
                    {String(b.status || '')}
                  </span>
                </div>
              </div>

              {/* Desktop layout */}
              <div className="hidden lg:flex lg:items-center lg:justify-between lg:gap-4">
                {/* Left section: User info */}
                <div className="flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="bg-gray-100 p-2 rounded-lg">
                      <Calendar className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">{getFacilityName(b.facilityId)}</h4>
                      {b.courseYearDept && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          <span className="font-medium">Course/Year/Dept:</span> <span className="text-blue-700 font-semibold">{b.courseYearDept}</span>
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-500">User:</span>
                        <span className="text-xs text-gray-700 font-medium">{getUserEmail(b.userId)}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-gray-500">Participants:</span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{b.participants || 0}</span>
                        {b.purpose && (
                          <>
                            <span className="text-gray-300">•</span>
                            <TooltipProvider>
                              <Tooltip>
                                <Popover>
                                  <TooltipTrigger asChild>
                                    <PopoverTrigger asChild>
                                      <button
                                        className="inline-flex items-center gap-1 text-xs text-pink-600 hover:text-pink-700 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                        <span>Purpose</span>
                                      </button>
                                    </PopoverTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                      <p className="font-semibold text-sm text-gray-800">Purpose</p>
                                    </div>
                                    <div className="p-3">
                                      <p className="text-sm text-gray-900 leading-5 break-words">{b.purpose}</p>
                                    </div>
                                  </TooltipContent>
                                  <PopoverContent side="top" className="max-w-sm p-0 bg-white border border-gray-300 shadow-xl rounded-lg overflow-hidden z-50">
                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                      <p className="font-semibold text-sm text-gray-800">Purpose</p>
                                    </div>
                                    <div className="p-3 max-h-48 overflow-y-auto">
                                      <p className="text-sm text-gray-900 leading-5 break-words">{b.purpose}</p>
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
                      <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">{format(new Date(b.startTime), "h:mm a")}</p>
                      <p className="text-xs text-gray-500">{format(new Date(b.startTime), "M/d/yyyy")}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-medium text-gray-500">Ends</p>
                      <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">{format(new Date(b.endTime), "h:mm a")}</p>
                      <p className="text-xs text-gray-500">{format(new Date(b.endTime), "M/d/yyyy")}</p>
                    </div>
                  </div>
                  {/* Status */}
                  <div>
                    <span className={`text-xs font-semibold ${statusClass(b.status)} capitalize px-3 py-1.5 rounded-full`}>
                      {String(b.status || '')}
                    </span>
                  </div>
                  {/* Equipment List */}
                  {items.length > 0 && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-2 w-[280px] h-[120px] flex flex-col shadow-sm">
                      <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
                        <h5 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Equipment</h5>
                      </div>
                      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
                        <div className="space-y-0.5">{items.map((item: string, idx: number) => {
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
                          <div key={`eq-${b.id}-${idx}`} className="flex items-center justify-between py-1">
                            <span className="text-xs text-gray-700 font-medium">{item}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
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
                          <div className="flex items-center justify-between py-1">
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
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
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
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {filteredBookingHistory.length > itemsPerPage && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {historyPage * itemsPerPage + 1} to {Math.min((historyPage + 1) * itemsPerPage, filteredBookingHistory.length)} of {filteredBookingHistory.length} results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHistoryPage((prev) => Math.max(Number(prev) - 1, 0))}
              disabled={historyPage === 0}
              className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 text-sm font-medium">
              {historyPage + 1} of {Math.ceil(filteredBookingHistory.length / itemsPerPage)}
            </span>
            <button
              onClick={() => setHistoryPage((prev) => (filteredBookingHistory && (Number(prev) + 1) * itemsPerPage < filteredBookingHistory.length ? Number(prev) + 1 : Number(prev)))}
              disabled={!filteredBookingHistory || (historyPage + 1) * itemsPerPage >= filteredBookingHistory.length}
              className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={closeModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Booking History Details</DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6 pt-4">
              {/* Status */}
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">Status</h3>
                <Badge 
                  variant={
                    selectedBooking.status === 'cancelled' || selectedBooking.status === 'denied' ? 'destructive' :
                    selectedBooking.status === 'expired' || selectedBooking.status === 'void' ? 'secondary' :
                    'default'
                  }
                  className="text-sm px-3 py-1"
                >
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

              {/* Admin Response - Only show if there's non-JSON text */}
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



import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CancellationModalProps {
  showCancelModal: boolean;
  setShowCancelModal: (value: boolean) => void;
  bookingToCancel: any;
  cancelBookingMutationStatus: string;
  getFacilityDisplay: (facilityId: number) => string;
  confirmCancelBooking: () => void;
  cancelCancelBooking: () => void;
}

export function CancellationModal({
  showCancelModal,
  setShowCancelModal,
  bookingToCancel,
  cancelBookingMutationStatus,
  getFacilityDisplay,
  confirmCancelBooking,
  cancelCancelBooking,
}: CancellationModalProps) {
  if (!bookingToCancel) return null;

  const now = new Date();
  const start = new Date(bookingToCancel.startTime);
  const end = new Date(bookingToCancel.endTime);
  const isActive = start <= now && now <= end;

  return (
    <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {isActive ? 'End Booking' : 'Cancel Booking'}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                {isActive 
                  ? 'Ending this active booking will immediately free the facility for others.' 
                  : 'This action cannot be undone.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Booking Details:</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <span className="font-medium">Facility:</span>{' '}
                {bookingToCancel.facilityName || 
                  (bookingToCancel.facilityId ? getFacilityDisplay(bookingToCancel.facilityId) : '')}
              </p>
              <p>
                <span className="font-medium">Date:</span>{' '}
                {start.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p>
                <span className="font-medium">Time:</span>{' '}
                {start.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}{' '}
                -{' '}
                {end.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
              {bookingToCancel.courseYearDept && (
                <p>
                  <span className="font-medium">Course & Year/Department:</span>{' '}
                  {bookingToCancel.courseYearDept}
                </p>
              )}
            </div>
          </div>

          {bookingToCancel.purpose && (
            <div className="bg-white rounded-lg p-4 mb-4 border border-gray-100">
              <h4 className="font-medium text-gray-900 mb-2">Purpose</h4>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {bookingToCancel.purpose}
              </div>
            </div>
          )}

          {bookingToCancel.equipment && 
            ((Array.isArray(bookingToCancel.equipment.items) && bookingToCancel.equipment.items.length > 0) || 
             (bookingToCancel.equipment.others && String(bookingToCancel.equipment.others).trim().length > 0)) && (
            <div className="bg-white rounded-lg p-4 mb-4 border border-gray-100">
              <h4 className="font-medium text-gray-900 mb-2">Equipment / Needs</h4>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(bookingToCancel.equipment.items) && 
                  bookingToCancel.equipment.items.map((it: string, idx: number) => (
                    <span 
                      key={`cancel-eq-${idx}`} 
                      className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full border border-gray-200"
                    >
                      {it}
                    </span>
                  ))}
                {bookingToCancel.equipment.others && 
                  String(bookingToCancel.equipment.others).trim().length > 0 && (
                  <div className="w-full text-sm text-gray-700 mt-2">
                    Others: {bookingToCancel.equipment.others}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <p className="text-sm text-gray-700 mb-6">
            {isActive
              ? 'Are you sure you want to end this active booking? This will immediately free up the facility.'
              : 'Are you sure you want to cancel this booking? This action cannot be undone and may affect other users waiting for this time slot.'}
          </p>

          <div className="flex gap-3">
            <Button
              onClick={cancelCancelBooking}
              variant="outline"
              className="flex-1"
              disabled={cancelBookingMutationStatus === 'pending'}
            >
              Keep Booking
            </Button>
            <Button
              onClick={confirmCancelBooking}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              disabled={cancelBookingMutationStatus === 'pending'}
            >
              {cancelBookingMutationStatus === 'pending' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isActive ? 'Ending...' : 'Cancelling...'}
                </span>
              ) : (
                isActive ? 'Yes, End Booking' : 'Yes, Cancel Booking'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

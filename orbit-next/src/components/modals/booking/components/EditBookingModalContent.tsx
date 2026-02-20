/**
 * EditBookingModalContent.tsx
 * 
 * Complete edit booking modal using shared utilities.
 * Minimal custom logic - everything delegated to utilities and hooks.
 */

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/ui';
import { CustomTextarea } from '@/components/ui/custom-textarea';
import { NumberInputWithControls } from './NumberInputWithControls';
import { BookingSummary } from './BookingSummary';
import { SimpleTimeSlotPicker } from './SimpleTimeSlotPicker';
import { EQUIPMENT_OPTIONS, FORM_LIMITS, type EquipmentStateValue } from '../schemas/bookingSchema';
import {
  deriveInitialBookingState,
  buildEquipmentPayload,
} from '../utils/formStateUtils';
import {
  getFacilityMaxCapacity,
} from '../utils/facilityUtils';
import {
  formatBookingConflictMessage,
} from '../utils/validationUtils';
import { useSlotManagement, useFormValidation } from '../hooks';
import { getNow, SUBMISSION_COOLDOWN } from '../utils/editBookingUtils';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

interface EditBookingModalContentProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  facilities: any[];
  onSave: (updatedBooking: any) => Promise<any> | void;
}

export function EditBookingModalContent({
  isOpen,
  onClose,
  booking,
  facilities,
  onSave,
}: EditBookingModalContentProps) {
  const { toast } = useToast();
  const { PURPOSE_MAX, COURSE_MAX, OTHERS_MAX } = FORM_LIMITS;

  // Derive initial state
  const initialState = useMemo(() => {
    const state = deriveInitialBookingState(booking);
    console.log('EditBookingModal - Initial state:', state);
    console.log('EditBookingModal - startTime:', state.startTime);
    console.log('EditBookingModal - endTime:', state.endTime);
    return state;
  }, [booking]);

  // Form state
  const [purpose, setPurpose] = useState(initialState.purpose);
  const [courseYearDept, setCourseYearDept] = useState(initialState.courseYearDept);
  const [startTime, setStartTime] = useState<Date | undefined>(initialState.startTime);
  const [endTime, setEndTime] = useState<Date | undefined>(initialState.endTime);
  const [participants, setParticipants] = useState(initialState.participants);
  const [equipmentState, setEquipmentState] = useState<Record<string, EquipmentStateValue>>(initialState.equipmentState);
  const [equipmentOtherText, setEquipmentOtherText] = useState(initialState.equipmentOtherText);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmissionTime, setLastSubmissionTime] = useState(0);

  const facilityId = initialState.facilityId;
  const selectedFacility = useMemo(() => 
    facilities.find(f => f.id === parseInt(facilityId, 10)),
    [facilities, facilityId]
  );
  const maxCapacity = useMemo(() => getFacilityMaxCapacity(selectedFacility), [selectedFacility]);

  // Hooks
  const slotManagement = useSlotManagement(isOpen, selectedFacility?.name);

  // Fetch user's bookings for conflict detection
  const { data: userBookingsData } = useQuery({
    queryKey: ['/api/bookings'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/bookings');
      return res.json();
    },
    enabled: isOpen,
  });

  const allBookings = userBookingsData || [];

  const { formValidationWarnings } = useFormValidation({
    facilityId,
    startTime,
    endTime,
    purpose,
    courseYearDept,
    participants,
    facilities,
    allBookings,
    userEmail: booking?.userId,
    existingBookingId: booking?.id,
  });

  const handleSave = async () => {
    const currentTimestamp = getNow();
    if (isSubmitting || currentTimestamp - lastSubmissionTime < SUBMISSION_COOLDOWN) {
      toast({
        title: "Please Wait",
        description: "Please wait a moment before submitting another update.",
        variant: "destructive",
      });
      return;
    }

    if (!purpose.trim()) {
      toast({
        title: "Validation Error",
        description: "Purpose is required.",
        variant: "destructive",
      });
      return;
    }

    if (formValidationWarnings.length > 0) {
      toast({
        title: "Validation Error",
        description: formValidationWarnings[0].description,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...booking,
        purpose,
        courseYearDept,
        facilityId: parseInt(facilityId, 10),
        startTime: startTime!.toISOString(),
        endTime: endTime!.toISOString(),
        participants,
        equipment: buildEquipmentPayload(equipmentState, equipmentOtherText),
        holdId: slotManagement.lockedSlot?.holdId,
      };

      await onSave(payload);
      await slotManagement.releaseHold();
      setIsSubmitting(false);
      setLastSubmissionTime(getNow());
      onClose();
    } catch (error: any) {
      setIsSubmitting(false);
      const message = error?.message ?? "An error occurred while updating your booking.";
      
      toast({
        title: "Error",
        description: formatBookingConflictMessage(message),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
          <DialogDescription>Update booking details: date, time, participants, and purpose.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Facility, Course/Department, and Participants */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Facility (Read-only) */}
            <div>
              <Label>Facility</Label>
              <div className="py-2 px-3 bg-gray-50 border rounded text-sm h-10 flex items-center">
                {selectedFacility?.name || ""}
              </div>
            </div>

            {/* Course/Department */}
            <div>
              <Label>
                Course & Year/Department <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  value={courseYearDept}
                  onChange={(e) => setCourseYearDept(e.target.value)}
                  placeholder="e.g. BSIT 3rd Year"
                  maxLength={COURSE_MAX}
                  required
                  className={courseYearDept.length >= COURSE_MAX ? 'border-red-500 focus:ring-red-500' : ''}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  {courseYearDept.length}/{COURSE_MAX}
                </div>
              </div>
            </div>

            {/* Participants */}
            <div>
              <Label>Number of Participants</Label>
              <NumberInputWithControls
                value={participants}
                onChange={setParticipants}
                min={1}
                max={maxCapacity}
              />
            </div>
          </div>

          {/* Time Slot Picker */}
          {selectedFacility && startTime && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <Label className="block mb-3">Quick Select Time Slot</Label>
              <SimpleTimeSlotPicker
                facilityId={selectedFacility.id}
                date={startTime || new Date()}
                onSelectSlot={(start, end) => {
                  setStartTime(start);
                  setEndTime(end);
                }}
              />
            </div>
          )}

          {/* Date and Time */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Start Date & Time</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={startTime ? new Date(startTime.getTime() - startTime.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : ''}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const currentTime = startTime || new Date();
                    const newDate = new Date(e.target.value);
                    newDate.setHours(currentTime.getHours(), currentTime.getMinutes());
                    setStartTime(newDate);
                  }}
                />
                <Input
                  type="time"
                  value={startTime ? new Date(startTime.getTime() - startTime.getTimezoneOffset() * 60000).toISOString().slice(11, 16) : ''}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const currentDate = startTime || new Date();
                    const [hours, minutes] = e.target.value.split(':');
                    const newDate = new Date(currentDate);
                    newDate.setHours(parseInt(hours), parseInt(minutes));
                    setStartTime(newDate);
                  }}
                />
              </div>
            </div>
            <div>
              <Label>End Date & Time</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={endTime ? new Date(endTime.getTime() - endTime.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : ''}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const currentTime = endTime || new Date();
                    const newDate = new Date(e.target.value);
                    newDate.setHours(currentTime.getHours(), currentTime.getMinutes());
                    setEndTime(newDate);
                  }}
                />
                <Input
                  type="time"
                  value={endTime ? new Date(endTime.getTime() - endTime.getTimezoneOffset() * 60000).toISOString().slice(11, 16) : ''}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const currentDate = endTime || new Date();
                    const [hours, minutes] = e.target.value.split(':');
                    const newDate = new Date(currentDate);
                    newDate.setHours(parseInt(hours), parseInt(minutes));
                    setEndTime(newDate);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Purpose */}
          <div>
            <Label>
              Purpose <span className="text-red-500">*</span>
            </Label>
            <CustomTextarea
              value={purpose}
              onChange={setPurpose}
              placeholder="Describe your purpose for booking this facility"
              maxLength={PURPOSE_MAX}
              isInvalid={purpose.length >= PURPOSE_MAX}
              required
            />
          </div>

          {/* Equipment */}
          <div>
            <Label className="block mb-3">Additional Equipment</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {EQUIPMENT_OPTIONS.map((option) => (
                <div key={option.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!equipmentState[option.key]}
                    onChange={(e) => setEquipmentState({ ...equipmentState, [option.key]: e.target.checked ? 'prepared' : false })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm">{option.label}</span>
                </div>
              ))}
              <div>
                <Input
                  value={equipmentOtherText}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, OTHERS_MAX);
                    setEquipmentOtherText(value);
                    setEquipmentState({ ...equipmentState, others: value.trim() ? 'prepared' : false });
                  }}
                  placeholder="Other equipment..."
                  maxLength={OTHERS_MAX}
                />
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          <BookingSummary
            facility={selectedFacility}
            startTime={startTime}
            endTime={endTime}
            participants={participants}
            purpose={purpose}
            courseYearDept={courseYearDept}
            equipment={equipmentState}
            equipmentOtherText={equipmentOtherText}
          />

          {/* Validation Warnings */}
          {formValidationWarnings.length > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              {formValidationWarnings.map((warning, idx) => (
                <div key={idx} className="flex items-start gap-3 mb-2 last:mb-0">
                  <span className="text-yellow-600 text-xl">⚠️</span>
                  <div>
                    <p className="font-medium text-yellow-800">{warning.title}</p>
                    <p className="text-sm text-yellow-700">{warning.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

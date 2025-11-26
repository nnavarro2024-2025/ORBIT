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
  const initialState = useMemo(() => deriveInitialBookingState(booking), [booking]);

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
  const { formValidationWarnings } = useFormValidation({
    facilityId,
    startTime,
    endTime,
    purpose,
    participants,
    facilities,
    allBookings: [],
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
          {/* Validation Warnings */}
          {formValidationWarnings.length > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              {formValidationWarnings.map((warning, idx) => (
                <div key={idx} className="flex items-start gap-3 mb-2 last:mb-0">
                  <span className="text-yellow-600">⚠️</span>
                  <div>
                    <p className="font-medium text-yellow-800">{warning.title}</p>
                    <p className="text-sm text-yellow-700">{warning.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Facility (Read-only) */}
          <div>
            <Label>Facility</Label>
            <div className="py-2 px-3 bg-gray-50 border rounded text-sm">
              {selectedFacility?.name || ""}
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Start Date & Time</Label>
              <Input
                type="datetime-local"
                value={startTime ? new Date(startTime.getTime() - startTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                onChange={(e) => setStartTime(new Date(e.target.value))}
              />
            </div>
            <div>
              <Label>End Date & Time</Label>
              <Input
                type="datetime-local"
                value={endTime ? new Date(endTime.getTime() - endTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                onChange={(e) => setEndTime(new Date(e.target.value))}
              />
            </div>
          </div>

          {/* Participants */}
          <div>
            <Label>Participants</Label>
            <NumberInputWithControls
              value={participants}
              onChange={setParticipants}
              min={1}
              max={maxCapacity}
            />
          </div>

          {/* Purpose */}
          <div>
            <Label>Purpose</Label>
            <CustomTextarea
              value={purpose}
              onChange={setPurpose}
              placeholder="Describe your purpose for booking this facility"
              maxLength={PURPOSE_MAX}
              isInvalid={purpose.length >= PURPOSE_MAX}
            />
          </div>

          {/* Course/Department */}
          <div>
            <Label>Course & Year/Department</Label>
            <CustomTextarea
              value={courseYearDept}
              onChange={setCourseYearDept}
              placeholder="e.g. BSIT 3rd Year, Faculty of Engineering"
              maxLength={COURSE_MAX}
              rows={1}
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
            equipment={equipmentState}
            equipmentOtherText={equipmentOtherText}
          />
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

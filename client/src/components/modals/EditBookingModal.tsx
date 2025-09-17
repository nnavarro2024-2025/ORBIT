import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { CustomTextarea } from "@/components/ui/custom-textarea";

// Small helper: return a short description for known facility names (same helper as BookingModal)
const getFacilityDescriptionByName = (name?: string) => {
  if (!name) return '';
  const lower = name.toLowerCase();
  if (lower.includes('collaborative learning room 1') || lower.includes('collaborative learning room 2') || lower.includes('collaborative learning')) {
    return 'Collaborative space for group study and small projects (up to 8 people).';
  }
  if (lower.includes('board room') || lower.includes('boardroom')) {
    return 'Formal boardroom for meetings and presentations (up to 12 people).';
  }
  return 'Comfortable study space suitable for individual or small group use.';
};

// Library working hours validation functions
const isWithinLibraryHours = (date: Date): boolean => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  // 7:30 AM = 7 * 60 + 30 = 450 minutes
  // 5:00 PM = 17 * 60 = 1020 minutes
  const libraryOpenTime = 7 * 60 + 30; // 7:30 AM
  const libraryCloseTime = 17 * 60; // 5:00 PM
  
  return timeInMinutes >= libraryOpenTime && timeInMinutes <= libraryCloseTime;
};

const formatLibraryHours = (): string => {
  return "7:30 AM - 5:00 PM";
};

// Custom Number Input with Controls (copied from BookingModal.tsx)
interface NumberInputWithControlsProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

const NumberInputWithControls: React.FC<NumberInputWithControlsProps> = ({
  value,
  onChange,
  min = 1,
  max = 99,
}) => {
  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleDecrement}
        disabled={value <= min}
        className="h-8 w-8 shrink-0"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="text" // Changed to text to avoid native spin buttons
        value={value}
        onChange={(e) => {
          const numValue = parseInt(e.target.value);
          if (!isNaN(numValue) && numValue >= min && numValue <= max) {
            onChange(numValue);
          } else if (e.target.value === "") {
            onChange(min); // Or some other default behavior for empty input
          }
        }}
        className="w-16 text-center"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleIncrement}
        disabled={value >= max}
        className="h-8 w-8 shrink-0"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};

interface EditBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  facilities: any[];
  // onSave may return a Promise resolving to the updated booking
  onSave: (updatedBooking: any) => Promise<any> | void;
}

export default function EditBookingModal({
  isOpen,
  onClose,
  booking,
  facilities,
  onSave,
}: EditBookingModalProps) {
  const [purpose, setPurpose] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const PURPOSE_MAX = 200;
  const OTHERS_MAX = 50;
  const [startTime, setStartTime] = useState<Date | undefined>();
  const [endTime, setEndTime] = useState<Date | undefined>();
  const [participants, setParticipants] = useState(1); // Add participants state
  const EQUIPMENT_OPTIONS = [
    { key: 'whiteboard', label: 'Whiteboard & Markers' },
    { key: 'projector', label: 'Projector' },
    { key: 'extension_cord', label: 'Extension Cord' },
    { key: 'hdmi', label: 'HDMI Cable' },
    { key: 'extra_chairs', label: 'Extra Chairs' },
    { key: 'others', label: 'Others' },
  ];
  const [equipmentState, setEquipmentState] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    EQUIPMENT_OPTIONS.forEach(o => init[o.key] = false);
    return init;
  });
  const [equipmentOtherText, setEquipmentOtherText] = useState('');
  const { toast } = useToast(); // Add toast
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmissionTime, setLastSubmissionTime] = useState(0);
  const SUBMISSION_COOLDOWN = 2000; // 2 seconds cooldown between submissions
  const [purposeError, setPurposeError] = useState("");
  // Inline form validation warnings (same shape as BookingModal)
  const [formValidationWarnings, setFormValidationWarnings] = useState<Array<{title: string; description: string}>>([]);

  useEffect(() => {
    if (booking) {
      setPurpose(booking.purpose || "");
      setFacilityId(booking.facilityId?.toString() || "");
      setPurposeError(""); // Clear any previous validation errors

      const now = new Date();
      const defaultStart = new Date(now.getTime() + 1 * 60 * 1000);

      let computedStart = booking.startTime ? new Date(booking.startTime) : defaultStart;
      if (computedStart.getTime() < now.getTime()) {
        computedStart = defaultStart;
      }

      let computedEnd = booking.endTime ? new Date(booking.endTime) : new Date(computedStart.getTime() + 30 * 60 * 1000);
      if (!computedEnd || computedEnd.getTime() <= computedStart.getTime()) {
        computedEnd = new Date(computedStart.getTime() + 30 * 60 * 1000);
      }

      setStartTime(computedStart);
      setEndTime(computedEnd);
      setParticipants(booking.participants || 1); // Initialize participants
    }
  }, [booking]);

  // Clear inline warnings when fields change
  useEffect(() => {
    if (formValidationWarnings.length === 0) return;
    // Watch our local fields - simple effect based on their state
    const handler = () => {
      setFormValidationWarnings([]);
    };
    // If user changes startTime/endTime/facilityId/participants/purpose, clear warnings
    // We'll attach simple local watchers via refs to state changes by using another effect
    // Note: This effect runs when any of the below states change and clears warnings.
    handler();
  }, [startTime, endTime, facilityId, participants, purpose]);

  // Keep end time 30 minutes after start if end is missing or earlier than start
  useEffect(() => {
    if (!startTime) return;
    if (!endTime || endTime.getTime() <= startTime.getTime()) {
      setEndTime(new Date(startTime.getTime() + 30 * 60 * 1000));
    }
  }, [startTime]);

  const isDurationValid = (start?: Date, end?: Date) => {
    if (!start || !end) return false;
    const diff = end.getTime() - start.getTime();
    return diff >= 30 * 60 * 1000;
  };

  const calculateDuration = (start?: Date, end?: Date) => {
    if (!start || !end) return "";
    const diff = end.getTime() - start.getTime();
    if (diff <= 0) return "";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleSave = async () => {
    // Prevent rapid duplicate submissions
    const currentTimestamp = Date.now();
    if (isSubmitting || (currentTimestamp - lastSubmissionTime < SUBMISSION_COOLDOWN)) {
      toast({
        title: "Please Wait",
        description: "Please wait a moment before submitting another update.",
        variant: "destructive",
      });
      return;
    }

    // Validate purpose field
    if (!purpose || purpose.trim() === "") {
      setPurposeError("Purpose is required");
      return;
    }

    // Collect all validation errors
    const validationErrors: Array<{title: string, description: string}> = [];

    if (!facilityId || !startTime || !endTime) {
      validationErrors.push({
        title: "Missing Information",
        description: "Please fill in all required fields.",
      });
    }

    if (startTime && startTime.getTime() < new Date().getTime()) {
      validationErrors.push({
        title: "Invalid Start Time",
        description: "Start time is in the past.",
      });
    }

    // Validate library working hours for both start and end time
    const startTimeValid = startTime && isWithinLibraryHours(startTime);
    const endTimeValid = endTime && isWithinLibraryHours(endTime);
    
    if ((startTime && !startTimeValid) || (endTime && !endTimeValid)) {
      let timeIssues = [];
      if (startTime && !startTimeValid) timeIssues.push("start time");
      if (endTime && !endTimeValid) timeIssues.push("end time");
      
  validationErrors.push({
  title: "School Hours",
    description: `Your ${timeIssues.join(" and ")} ${timeIssues.length > 1 ? "are" : "is"} outside school operating hours (${formatLibraryHours()}). Room access is only available during these hours.`,
  });
    }

    // Validate end time is after start time
    if (startTime && endTime && endTime <= startTime) {
      validationErrors.push({
        title: "Invalid Time Selection",
        description: "End time must be after start time.",
      });
    }

    // Enforce minimum duration of 30 minutes
    if (startTime && endTime) {
      const diff = endTime.getTime() - startTime.getTime();
      const minMs = 30 * 60 * 1000;
      if (diff > 0 && diff < minMs) {
        validationErrors.push({
          title: "Invalid Duration",
          description: "Bookings must be at least 30 minutes long.",
        });
      }
    }

    // Validate same calendar day (no multi-day bookings)
    if (startTime && endTime) {
      if (startTime.getFullYear() !== endTime.getFullYear() || startTime.getMonth() !== endTime.getMonth() || startTime.getDate() !== endTime.getDate()) {
        validationErrors.push({
          title: "Single-Day Booking Required",
          description: "Start and end must be on the same calendar day. Please split multi-day events into separate bookings.",
        });
      }
    }

    // Validate facility and capacity
    if (facilityId) {
      const facility = facilities.find(f => f.id === parseInt(facilityId));
      if (!facility) {
        validationErrors.push({
          title: "Error",
          description: "Selected facility not found.",
        });
      } else {
        let maxCapacity = facility.capacity;
        const lowerCaseName = facility.name.toLowerCase();

        const isCLR1 = lowerCaseName.includes('collaborative learning room 1') || lowerCaseName.includes('collaborative learning 1');
        const isCLR2 = lowerCaseName.includes('collaborative learning room 2') || lowerCaseName.includes('collaborative learning 2');

        if (isCLR1 || isCLR2) {
          maxCapacity = 8;
        } else if (lowerCaseName.includes('board room') || lowerCaseName.includes('boardroom')) {
          maxCapacity = 12;
        }

        if (participants > maxCapacity) {
          validationErrors.push({
            title: "Capacity Exceeded",
            description: `The selected room has a maximum capacity of ${maxCapacity} people. Please reduce the number of participants.`,
          });
        }
      }
    }

    // Show all validation errors inline
    if (validationErrors.length > 0) {
      setIsSubmitting(false);
      setFormValidationWarnings(validationErrors);
      return;
    }

    // UX guard: if duration invalid, add inline warning and block save
    if (!isDurationValid(startTime, endTime)) {
      setFormValidationWarnings([{ title: 'Invalid Duration', description: 'Bookings must be at least 30 minutes long.' }]);
      return;
    }

    setFormValidationWarnings([]);
    setIsSubmitting(true);

    try {
      const payload = {
        ...booking,
        purpose,
        facilityId: parseInt(facilityId, 10),
        startTime: startTime!.toISOString(),
        endTime: endTime!.toISOString(),
        participants, // Include participants in saved data
        equipment: {
          items: Object.keys(equipmentState).filter(k => equipmentState[k]),
          others: equipmentOtherText.trim() || null,
        },
      };
  // payload prepared for save
      const result = await onSave(payload);

      setIsSubmitting(false);
      setLastSubmissionTime(Date.now());

      // Close after successful save; caller (BookingDashboard) updates cache
      onClose();
      return result;
    } catch (error: any) {
      setIsSubmitting(false);
      // Handle specific overlapping booking error
      if (error.message && error.message.includes("You already have another booking during this time")) {
        toast({
          title: "Booking Conflict",
          description: formatBookingConflictMessage(error.message),
          variant: "destructive",
        });
      }
      // Handle facility spam prevention error
      else if (error.message && error.message.includes("You already have an active booking for this facility")) {
        toast({
          title: "Facility Booking Limit",
          description: formatBookingConflictMessage(error.message),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "An error occurred while updating your booking.",
          variant: "destructive",
        });
      }
      return undefined;
    }
  };

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Helper function to format booking conflict error messages
  const formatBookingConflictMessage = (errorMessage: string) => {
    try {
      // Extract the readable part before any JSON or ID information
      const readablePart = errorMessage.split('. Existing booking:')[0];
      
      // If there's existing booking info, try to parse and format it nicely
      if (errorMessage.includes('Existing booking:') && errorMessage.includes('/')) {
        // Extract date/time information if present
        const dateTimeMatch = errorMessage.match(/(\d{1,2}\/\d{1,2}\/\d{4}[^"]*)/);
        if (dateTimeMatch) {
          return `${readablePart}. Your existing booking: ${dateTimeMatch[1]}`;
        }
      }
      
      // Remove any JSON-like content and IDs
      const cleanMessage = readablePart
        .replace(/\s*\{".*$/g, '') // Remove JSON part
        .replace(/\s*Please cancel your existing booking first.*$/g, '') // Remove redundant instruction
        .trim();
      
      return cleanMessage + '. Please cancel your existing booking first or choose a different time.';
    } catch (e) {
      // Fallback: clean up basic JSON and ID information
      return errorMessage
        .split('{"')[0] // Remove JSON part
        .replace(/ID:[^,\s]*/g, '') // Remove ID references
        .trim();
    }
  };

  // derive selected facility from facilityId for summary display
  const selectedFacility = facilityId ? facilities.find(f => f.id === parseInt(facilityId, 10)) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Edit Booking</DialogTitle>
          <DialogDescription>Update booking details: date, time, participants, and purpose.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6">
          {/* Facility + participants */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Facility</Label>
              <Select value={facilityId} onValueChange={setFacilityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a facility" />
                </SelectTrigger>
                <SelectContent>
                  {facilities.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id.toString()} description={getFacilityDescriptionByName(facility.name)} available={!!facility.isActive}>
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">Participants</Label>
              {(() => {
                const currentFacility = facilityId ? facilities.find(f => f.id === parseInt(facilityId)) : null;
                const maxCapacity = currentFacility && typeof currentFacility.capacity === 'number' && currentFacility.capacity > 0
                  ? currentFacility.capacity
                  : (currentFacility ? (currentFacility.name.toLowerCase().includes('board room') || currentFacility.name.toLowerCase().includes('boardroom') ? 12 : 8) : 8);

                return (
                  <div className="flex items-center gap-3">
                    <NumberInputWithControls
                      value={participants}
                      onChange={(val) => setParticipants(val)}
                      min={1}
                      max={maxCapacity}
                    />
                    <div className="text-xs text-muted-foreground ml-3">Max: {maxCapacity}</div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Start Date + Time split (matching BookingModal) */}
            <div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full text-left pl-3 h-10", !startTime && "text-muted-foreground")}>
                        {startTime ? format(startTime, "EEE, MMM d, yyyy") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startTime}
                        onSelect={(date) => {
                          if (!date) return;
                          const current = startTime || new Date();
                          const newDate = new Date(date);
                          newDate.setHours(current.getHours(), current.getMinutes(), 0, 0);
                          setStartTime(newDate);
                        }}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="invisible">Start Time</Label>
                  <Input
                    type="time"
                    step={300}
                    value={startTime ? format(startTime, "HH:mm") : ""}
                    onChange={(e) => {
                      const timeValue = e.target.value;
                      if (!timeValue) return;
                      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
                      if (!timeRegex.test(timeValue)) return;
                      const [hours, minutes] = timeValue.split(":").map(Number);
                      const newDate = startTime ? new Date(startTime) : new Date();
                      newDate.setHours(hours, minutes, 0, 0);
                      setStartTime(newDate);
                    }}
                    className="w-full h-10"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-700">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full text-left pl-3 h-10", !endTime && "text-muted-foreground")}>
                        {endTime ? format(endTime, "EEE, MMM d, yyyy") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endTime}
                        onSelect={(date) => {
                          if (!date) return;
                          const current = endTime || new Date();
                          const newDate = new Date(date);
                          newDate.setHours(current.getHours(), current.getMinutes(), 0, 0);
                          setEndTime(newDate);
                        }}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="invisible">End Time</Label>
                  <Input
                    type="time"
                    step={300}
                    value={endTime ? format(endTime, "HH:mm") : ""}
                    onChange={(e) => {
                      const timeValue = e.target.value;
                      if (!timeValue) return;
                      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
                      if (!timeRegex.test(timeValue)) return;
                      const [hours, minutes] = timeValue.split(":").map(Number);
                      const newDate = endTime ? new Date(endTime) : new Date();
                      newDate.setHours(hours, minutes, 0, 0);
                      setEndTime(newDate);
                    }}
                    className="w-full h-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Equipment checklist — copied from BookingModal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Additional Equipment or Needs</label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!equipmentState['whiteboard']}
                    onChange={(e) => setEquipmentState(prev => ({ ...prev, ['whiteboard']: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Whiteboard &amp; Markers</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!equipmentState['projector']}
                    onChange={(e) => setEquipmentState(prev => ({ ...prev, ['projector']: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Projector</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!equipmentState['extension_cord']}
                    onChange={(e) => setEquipmentState(prev => ({ ...prev, ['extension_cord']: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Extension Cord</span>
                </label>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!equipmentState['hdmi']}
                    onChange={(e) => setEquipmentState(prev => ({ ...prev, ['hdmi']: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">HDMI Cable</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!equipmentState['extra_chairs']}
                    onChange={(e) => setEquipmentState(prev => ({ ...prev, ['extra_chairs']: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Extra Chairs</span>
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!equipmentState['others']}
                    onChange={(e) => setEquipmentState(prev => ({ ...prev, ['others']: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Others</span>
                </div>

                <div className="mt-2 md:mt-1">
                  <Input
                    value={equipmentOtherText}
                    onChange={(e: any) => {
                      let val = e.target.value;
                      if (val.length > OTHERS_MAX) val = val.slice(0, OTHERS_MAX);
                      setEquipmentOtherText(val);
                      setEquipmentState(prev => ({ ...prev, ['others']: val.trim().length > 0 }));
                    }}
                    placeholder="Describe other needs"
                    aria-label="Other equipment details"
                    className="w-full"
                    maxLength={OTHERS_MAX}
                  />
                  {equipmentOtherText ? (
                    <div>
                      <div className={`text-xs mt-1 ${equipmentOtherText.length >= OTHERS_MAX ? 'text-red-600' : 'text-gray-500'}`}>{equipmentOtherText.length}/{OTHERS_MAX}</div>
                      {equipmentOtherText.length >= OTHERS_MAX ? (
                        <div className="text-xs text-red-600 mt-1">Maximum length reached ({OTHERS_MAX} characters)</div>
                      ) : null}
                    </div>
                  ) : null}

                </div>
              </div>
            </div>
          </div>

          {/* Purpose */}
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">Purpose</Label>
            <CustomTextarea value={purpose} onChange={(v) => {
              if (v && v.length > PURPOSE_MAX) setPurpose(v.slice(0, PURPOSE_MAX));
              else setPurpose(v);
              if (purposeError) setPurposeError("");
            }} placeholder="Describe your purpose for booking this facility" maxLength={PURPOSE_MAX} isInvalid={purpose.length >= PURPOSE_MAX} />
            {purpose.length >= PURPOSE_MAX && <div className="text-xs text-red-600 mt-1">Maximum length reached ({PURPOSE_MAX} characters)</div>}
            {purposeError && <div className="text-sm text-red-600 mt-1">{purposeError}</div>}
          </div>

          {/* Inline warnings */}
          {formValidationWarnings.length > 0 && (
            <div className="mt-3 text-sm rounded-b-lg px-4 py-3 bg-white border-t border-gray-200">
              {formValidationWarnings.map((w, idx) => (
                <div key={idx} className="mb-1">
                  <span className="mr-2">⚠️</span>
                  <span className="font-medium">{w.title}:</span>
                  <span className="ml-2">{w.description}</span>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Booking Summary (matches New Booking modal boxed layout) */}
        {(selectedFacility || startTime || endTime || purpose) && (
          <div className="border-t pt-6">
            <h3 className="font-medium mb-4">Booking Summary</h3>
            <div className="bg-accent/50 p-4 rounded-lg space-y-2">
              {selectedFacility && (
                <div className="flex justify-between">
                  <span className="text-sm">Facility:</span>
                  <span className="text-sm font-medium">{selectedFacility.name}</span>
                </div>
              )}

              {startTime && endTime && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm">Date:</span>
                    <span className="text-sm font-medium">{format(startTime, "EEE, MMM d, yyyy")}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm">Time:</span>
                    <span className="text-sm font-medium">{format(startTime, "hh:mm a")} - {format(endTime, "hh:mm a")}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm">Duration:</span>
                    <span className="text-sm font-medium">{calculateDuration(startTime, endTime)}</span>
                  </div>
                </>
              )}

              {participants && (
                <div className="flex justify-between">
                  <span className="text-sm">Participants:</span>
                  <span className="text-sm font-medium">{participants}</span>
                </div>
              )}

              {purpose && (
                <div className="flex flex-col space-y-1 pt-2 border-t border-gray-200">
                  <span className="text-sm text-gray-600">Purpose:</span>
                  <div className="text-left text-sm font-medium text-gray-900 bg-white p-2 rounded border" style={{ wordWrap: 'break-word', overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'pre-wrap', maxWidth: '100%', overflow: 'hidden' }}>
                    {purpose}
                  </div>
                </div>
              )}

              {(Object.keys(equipmentState).filter(k => equipmentState[k]).length > 0 || equipmentOtherText) && (
                <div className="flex flex-col space-y-1 pt-2 border-t border-gray-200">
                  <span className="text-sm text-gray-600">Equipment:</span>
                  <div className="text-sm font-medium text-gray-900 bg-white p-2 rounded border" style={{ wordWrap: 'break-word', overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'pre-wrap', maxWidth: '100%', overflow: 'hidden' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {Object.keys(equipmentState)
                        .filter(k => equipmentState[k])
                        .filter(k => !(k === 'others' && equipmentOtherText))
                        .map(k => (
                          <div key={`summary-eq-${k}`} className="text-sm">{EQUIPMENT_OPTIONS.find(o => o.key === k)?.label || k}</div>
                        ))}

                      {equipmentOtherText ? (
                        <div className="text-sm sm:col-span-3">Others: {equipmentOtherText}</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <div className="w-full flex items-center justify-between gap-4">
            <div className="flex gap-3 w-1/2">
              <div className="flex-1">
                <Button variant="outline" onClick={onClose} className="w-full">Cancel</Button>
              </div>
              <div className="flex-1">
                <Button onClick={() => setShowConfirmDialog(true)} disabled={isSubmitting || !isDurationValid(startTime, endTime)} className="w-full">
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>

            <div className="w-1/2 text-right text-sm text-gray-500">
              {(!isDurationValid(startTime, endTime)) ? <span className="text-red-600">⚠️ Bookings must be at least 30 minutes long.</span> : <span>Validation or submission errors will appear below.</span>}
            </div>
          </div>

          <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Update</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to save changes to this booking?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { setShowConfirmDialog(false); handleSave(); }}>Confirm</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
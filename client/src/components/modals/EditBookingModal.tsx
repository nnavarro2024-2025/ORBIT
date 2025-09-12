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
  const [startTime, setStartTime] = useState<Date | undefined>();
  const [endTime, setEndTime] = useState<Date | undefined>();
  const [participants, setParticipants] = useState(1); // Add participants state
  const { toast } = useToast(); // Add toast
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmissionTime, setLastSubmissionTime] = useState(0);
  const SUBMISSION_COOLDOWN = 2000; // 2 seconds cooldown between submissions
  const [purposeError, setPurposeError] = useState("");

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

  // Keep end time 30 minutes after start if end is missing or earlier than start
  useEffect(() => {
    if (!startTime) return;
    if (!endTime || endTime.getTime() <= startTime.getTime()) {
      setEndTime(new Date(startTime.getTime() + 30 * 60 * 1000));
    }
  }, [startTime]);

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
        title: "Library Hours",
        description: `Your ${timeIssues.join(" and ")} ${timeIssues.length > 1 ? "are" : "is"} outside library operating hours (${formatLibraryHours()}). Room access is only available during these hours.`,
      });
    }

    // Validate end time is after start time
    if (startTime && endTime && endTime <= startTime) {
      validationErrors.push({
        title: "Invalid Time Selection",
        description: "End time must be after start time.",
      });
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

    // Show all validation errors as separate toasts
    if (validationErrors.length > 0) {
      setIsSubmitting(false);
      validationErrors.forEach((error, index) => {
        // Add a small delay between toasts to prevent them from overlapping
        setTimeout(() => {
          toast({
            title: error.title,
            description: error.description,
            variant: "destructive",
          });
        }, index * 100); // 100ms delay between each toast
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...booking,
        purpose,
        facilityId: parseInt(facilityId, 10),
        startTime: startTime!.toISOString(),
        endTime: endTime!.toISOString(),
        participants, // Include participants in saved data
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


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
          <DialogDescription>Update booking details: date, time, participants, and purpose.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="purpose" className="text-right">
              Purpose
            </Label>
            <Input
              id="purpose"
              value={purpose}
              onChange={(e) => {
                setPurpose(e.target.value);
                if (purposeError) setPurposeError(""); // Clear error when user types
              }}
              className={`col-span-3 ${purposeError ? "border-red-500" : ""}`}
            />
            {purposeError && (
              <p className="col-span-3 col-start-2 text-sm text-red-600 mt-1">
                {purposeError}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="facility" className="text-right">
              Facility
            </Label>
            <Select value={facilityId} onValueChange={setFacilityId}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a facility" />
              </SelectTrigger>
              <SelectContent>
                  {facilities.map((facility) => (
                    <SelectItem
                      key={facility.id}
                      value={facility.id.toString()}
                      available={!!facility.isActive}
                      description={getFacilityDescriptionByName(facility.name)}
                    >
                      {facility.name}
                    </SelectItem>
                  ))}
                </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="participants" className="text-right">
              Participants
            </Label>
            <div className="col-span-3">
              {/** compute current facility and max capacity similar to BookingModal */}
              {(() => {
                const currentFacility = facilityId ? facilities.find(f => f.id === parseInt(facilityId)) : null;
                const maxCapacity = currentFacility && typeof currentFacility.capacity === 'number' && currentFacility.capacity > 0
                  ? currentFacility.capacity
                  : // fallback by name heuristics
                  (currentFacility ? (currentFacility.name.toLowerCase().includes('board room') || currentFacility.name.toLowerCase().includes('boardroom') ? 12 : 8) : 8);

                return (
                  <>
                    <NumberInputWithControls
                      value={participants}
                      onChange={(val) => setParticipants(Math.min(typeof val === 'string' ? parseInt(val, 10) : val, maxCapacity))}
                      min={1}
                      max={maxCapacity}
                    />
                    <div className="text-xs text-muted-foreground mt-1">Max capacity: {maxCapacity}</div>
                  </>
                );
              })()}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startTime" className="text-right">
              Start Time
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !startTime && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startTime ? format(startTime, "PPP hh:mm a") : <span>Pick a date and time</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startTime}
                  onSelect={(date) => {
                    if (date) {
                      const existingTime = startTime || new Date(); // Use existing time or current time
                      const newDateWithExistingTime = new Date(
                        date.getFullYear(),
                        date.getMonth(),
                        date.getDate(),
                        existingTime.getHours(),
                        existingTime.getMinutes(),
                        existingTime.getSeconds(),
                        existingTime.getMilliseconds()
                      );
                      setStartTime(newDateWithExistingTime);
                    }
                  }}
                  initialFocus
                />
                <div className="p-3 border-t border-border">
                  <Label htmlFor="startTimeInput" className="sr-only">Time</Label>
                  <Input
                    id="startTimeInput"
                    type="time"
                    step={300}
                    value={startTime ? format(startTime, "HH:mm") : ""}
                    onChange={(e) => {
                      const timeValue = e.target.value;
                      if (!timeValue) return;

                      // Validate time format (HH:MM)
                      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
                      if (!timeRegex.test(timeValue)) {
                        return; // Invalid time format, don't update
                      }

                      const [hours, minutes] = timeValue.split(":").map(Number);
                      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                        return; // Invalid time values, don't update
                      }

                      if (startTime) { // If startTime is already a valid Date
                        const newTimeWithExistingDate = new Date(startTime); // Clone existing date
                        newTimeWithExistingDate.setHours(hours);
                        newTimeWithExistingDate.setMinutes(minutes);
                        setStartTime(newTimeWithExistingDate);
                      } else { // If startTime is undefined, create a new Date with current date and selected time
                        const now = new Date();
                        now.setHours(hours);
                        now.setMinutes(minutes);
                        setStartTime(now);
                      }
                    }}
                    className="w-full"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endTime" className="text-right">
              End Time
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !endTime && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endTime ? format(endTime, "PPP hh:mm a") : <span>Pick a date and time</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endTime}
                  onSelect={(date) => {
                    if (date) {
                      const existingTime = endTime || new Date(); // Use existing time or current time
                      const newDateWithExistingTime = new Date(
                        date.getFullYear(),
                        date.getMonth(),
                        date.getDate(),
                        existingTime.getHours(),
                        existingTime.getMinutes(),
                        existingTime.getSeconds(),
                        existingTime.getMilliseconds()
                      );
                      setEndTime(newDateWithExistingTime);
                    }
                  }}
                  initialFocus
                />
                <div className="p-3 border-t border-border">
                  <Label htmlFor="endTimeInput" className="sr-only">Time</Label>
                  <Input
                    id="endTimeInput"
                    type="time"
                    step={300}
                    value={endTime ? format(endTime, "HH:mm") : ""}
                    onChange={(e) => {
                      const timeValue = e.target.value;
                      if (!timeValue) return;

                      // Validate time format (HH:MM)
                      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
                      if (!timeRegex.test(timeValue)) {
                        return; // Invalid time format, don't update
                      }

                      const [hours, minutes] = timeValue.split(":").map(Number);
                      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                        return; // Invalid time values, don't update
                      }

                      if (endTime) { // If endTime is already a valid Date
                        const newTimeWithExistingDate = new Date(endTime); // Clone existing date
                        newTimeWithExistingDate.setHours(hours);
                        newTimeWithExistingDate.setMinutes(minutes);
                        setEndTime(newTimeWithExistingDate);
                      } else { // If endTime is undefined, create a new Date with current date and selected time
                        const now = new Date();
                        now.setHours(hours);
                        now.setMinutes(minutes);
                        setEndTime(now);
                      }
                    }}
                    className="w-full"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => setShowConfirmDialog(true)} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>

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
import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { format } from "date-fns";
import { Plus, Minus, Loader2, TriangleAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CustomTextarea } from "@/components/ui/custom-textarea";

const PURPOSE_MAX = 200;
const COURSE_MAX = 100;
const OTHERS_MAX = 50;
const MIN_BOOKING_DURATION_MS = 30 * 60 * 1000;
const SUBMISSION_COOLDOWN = 2000;

const EQUIPMENT_OPTIONS = [
  { key: "whiteboard", label: "Whiteboard & Markers" },
  { key: "projector", label: "Projector" },
  { key: "extension_cord", label: "Extension Cord" },
  { key: "hdmi", label: "HDMI Cable" },
  { key: "extra_chairs", label: "Extra Chairs" },
  { key: "others", label: "Others" },
] as const;

const getNow = () => Date.now();

const isWithinLibraryHours = (date: Date): boolean => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  const openMinutes = 7 * 60 + 30; // 7:30 AM
  const closeMinutes = 19 * 60; // 7:00 PM
  return totalMinutes >= openMinutes && totalMinutes <= closeMinutes;
};

const formatLibraryHours = () => "7:30 AM - 7:00 PM";

const createEmptyEquipmentState = () => {
  const base: Record<string, boolean> = {};
  EQUIPMENT_OPTIONS.forEach((option) => {
    base[option.key] = false;
  });
  return base;
};

const deriveInitialBookingState = (booking: any | null | undefined) => {
  const equipmentState = createEmptyEquipmentState();
  let equipmentOtherText = "";

  try {
    const eq = booking?.equipment;
    if (eq) {
      const items: string[] = Array.isArray(eq.items) ? eq.items.map((value: any) => String(value)) : [];
      items.forEach((itemKey) => {
        if (Object.prototype.hasOwnProperty.call(equipmentState, itemKey)) {
          equipmentState[itemKey] = true;
        }
      });

      if (eq.others && String(eq.others).trim().length > 0) {
        equipmentState["others"] = true;
        equipmentOtherText = String(eq.others);
      }
    }
  } catch (error) {
    console.warn("[EditBookingModal] Failed to derive equipment state", error);
  }

  const now = new Date();
  const defaultStart = new Date(now.getTime() + 1 * 60 * 1000);

  let startTime = booking?.startTime ? new Date(booking.startTime) : defaultStart;
  if (startTime.getTime() < now.getTime()) {
    startTime = defaultStart;
  }

  let endTime = booking?.endTime ? new Date(booking.endTime) : new Date(startTime.getTime() + MIN_BOOKING_DURATION_MS);
  if (!endTime || endTime.getTime() <= startTime.getTime()) {
    endTime = new Date(startTime.getTime() + MIN_BOOKING_DURATION_MS);
  }

  return {
    purpose: booking?.purpose || "",
    courseYearDept: booking?.courseYearDept || "",
    facilityId: booking?.facilityId?.toString() || "",
    startTime,
    endTime,
    participants: booking?.participants || 1,
    equipmentState,
    equipmentOtherText,
  };
};

const getFacilityMaxCapacity = (facility: any | null | undefined) => {
  if (!facility) return 8;
  const lowerName = String(facility.name || "").toLowerCase();
  if (lowerName.includes("collaborative learning room 1") || lowerName.includes("collaborative learning 1")) return 8;
  if (lowerName.includes("collaborative learning room 2") || lowerName.includes("collaborative learning 2")) return 8;
  if (lowerName.includes("board room") || lowerName.includes("boardroom")) return 12;
  const capacity = facility.capacity;
  return typeof capacity === "number" && capacity > 0 ? capacity : 8;
};

const formatDate = (date?: Date) => (date ? format(date, "EEE, MMM d, yyyy") : "");
const formatTime = (date?: Date) => (date ? format(date, "hh:mm a") : "");

type DerivedState = ReturnType<typeof deriveInitialBookingState>;

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
        type="text"
        value={value}
        onChange={(event) => {
          const numeric = parseInt(event.target.value, 10);
          if (!Number.isNaN(numeric) && numeric >= min && numeric <= max) {
            onChange(numeric);
          } else if (event.target.value === "") {
            onChange(min);
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
  onSave: (updatedBooking: any) => Promise<any> | void;
}

interface EditBookingModalContentProps {
  booking: any;
  facilities: any[];
  onClose: () => void;
  onSave: (updatedBooking: any) => Promise<any> | void;
  initialState: DerivedState;
}

function EditBookingModalContent({
  booking,
  facilities,
  onClose,
  onSave,
  initialState,
}: EditBookingModalContentProps) {
  const { toast } = useToast();
  const [purpose, setPurpose] = useState(initialState.purpose);
  const [courseYearDept, setCourseYearDept] = useState(initialState.courseYearDept);
  const facilityId = initialState.facilityId;
  const [startTime] = useState<Date | undefined>(initialState.startTime);
  const [endTime, setEndTime] = useState<Date | undefined>(initialState.endTime);
  const [participants, setParticipants] = useState(initialState.participants);
  const [equipmentState, setEquipmentState] = useState<Record<string, boolean>>({ ...initialState.equipmentState });
  const [equipmentOtherText, setEquipmentOtherText] = useState(initialState.equipmentOtherText);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmissionTime, setLastSubmissionTime] = useState(0);
  const [purposeError, setPurposeError] = useState("");
  const [formValidationWarnings, setFormValidationWarnings] = useState<Array<{ title: string; description: string }>>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const clearWarnings = () => {
    if (formValidationWarnings.length > 0) {
      setFormValidationWarnings([]);
    }
  };

  const isDurationValid = (start?: Date, end?: Date) => {
    if (!start || !end) return false;
    const diff = end.getTime() - start.getTime();
    return diff >= MIN_BOOKING_DURATION_MS;
  };

  const calculateDuration = (start?: Date, end?: Date) => {
    if (!start || !end) return "";
    const diff = end.getTime() - start.getTime();
    if (diff <= 0) return "";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const selectedFacility = useMemo(() => {
    return facilityId ? facilities.find((f) => f.id === parseInt(facilityId, 10)) ?? null : null;
  }, [facilities, facilityId]);

  const maxCapacity = useMemo(() => getFacilityMaxCapacity(selectedFacility), [selectedFacility]);

  const formatBookingConflictMessage = (errorMessage: string) => {
    try {
      const readablePart = errorMessage.split('. Existing booking:')[0];
      if (errorMessage.includes('Existing booking:') && errorMessage.includes('/')) {
        const dateTimeMatch = errorMessage.match(/(\d{1,2}\/\d{1,2}\/\d{4}[^"]*)/);
        if (dateTimeMatch) {
          return `${readablePart}. Your existing booking: ${dateTimeMatch[1]}`;
        }
      }
      const cleanMessage = readablePart
        .replace(/\s*\{".*$/g, '')
        .replace(/\s*Please cancel your existing booking first.*$/g, '')
        .trim();
      return `${cleanMessage}. Please cancel your existing booking first or choose a different time.`;
    } catch (error) {
      return errorMessage
        .split('{"')[0]
        .replace(/ID:[^,\s]*/g, '')
        .trim();
    }
  };

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
      setPurposeError("Purpose is required");
      return;
    }

    const validationErrors: Array<{ title: string; description: string }> = [];

    if (!facilityId || !startTime || !endTime) {
      validationErrors.push({
        title: "Missing Information",
        description: "Please fill in all required fields.",
      });
    }

    if (startTime && startTime.getTime() < Date.now()) {
      validationErrors.push({
        title: "Invalid Start Time",
        description: "Start time is in the past.",
      });
    }

    const startTimeValid = startTime && isWithinLibraryHours(startTime);
    const endTimeValid = endTime && isWithinLibraryHours(endTime);

    if ((startTime && !startTimeValid) || (endTime && !endTimeValid)) {
      const timeIssues: string[] = [];
      if (startTime && !startTimeValid) timeIssues.push("start time");
      if (endTime && !endTimeValid) timeIssues.push("end time");
      validationErrors.push({
        title: "School Hours",
        description: `Your ${timeIssues.join(" and ")} ${timeIssues.length > 1 ? "are" : "is"} outside school operating hours (${formatLibraryHours()}). Room access is only available during these hours.`,
      });
    }

    if (startTime && endTime && endTime.getTime() <= startTime.getTime()) {
      validationErrors.push({
        title: "Invalid Time Selection",
        description: "End time must be after start time.",
      });
    }

    if (startTime && endTime) {
      const diff = endTime.getTime() - startTime.getTime();
      if (diff > 0 && diff < MIN_BOOKING_DURATION_MS) {
        validationErrors.push({
          title: "Invalid Duration",
          description: "Bookings must be at least 30 minutes long.",
        });
      }
    }

    if (startTime && endTime) {
      const sameDay =
        startTime.getFullYear() === endTime.getFullYear() &&
        startTime.getMonth() === endTime.getMonth() &&
        startTime.getDate() === endTime.getDate();
      if (!sameDay) {
        validationErrors.push({
          title: "Single-Day Booking Required",
          description: "Start and end must be on the same calendar day. Please split multi-day events into separate bookings.",
        });
      }
    }

    if (facilityId) {
      const facility = facilities.find((f) => f.id === parseInt(facilityId, 10));
      if (!facility) {
        validationErrors.push({
          title: "Error",
          description: "Selected facility not found.",
        });
      } else {
        const capacity = getFacilityMaxCapacity(facility);
        if (participants > capacity) {
          validationErrors.push({
            title: "Capacity Exceeded",
            description: `The selected room has a maximum capacity of ${capacity} people. Please reduce the number of participants.`,
          });
        }
      }
    }

    if (validationErrors.length > 0) {
      setFormValidationWarnings(validationErrors);
      try {
        document.getElementById("edit-booking-form-errors")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (error) {
        /* ignore scroll errors */
      }
      return;
    }

    if (!isDurationValid(startTime, endTime)) {
      setFormValidationWarnings([{ title: "Invalid Duration", description: "Bookings must be at least 30 minutes long." }]);
      try {
        document.getElementById("edit-booking-form-errors")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (error) {
        /* ignore scroll errors */
      }
      return;
    }

    setFormValidationWarnings([]);
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
        equipment: {
          items: Object.keys(equipmentState).filter((key) => key !== "others" && equipmentState[key]),
          others: equipmentOtherText.trim() || null,
        },
      };

      await onSave(payload);
      setIsSubmitting(false);
      setLastSubmissionTime(getNow());
      onClose();
    } catch (error: any) {
      setIsSubmitting(false);
      const message = error?.message ?? "An error occurred while updating your booking.";
      if (message.includes("You already have another booking during this time")) {
        toast({
          title: "Booking Conflict",
          description: formatBookingConflictMessage(message),
          variant: "destructive",
        });
      } else if (message.includes("You already have an active booking for this facility")) {
        toast({
          title: "Facility Booking Limit",
          description: formatBookingConflictMessage(message),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    }
  };

  const selectedEquipmentLabels = Object.keys(equipmentState)
    .filter((key) => equipmentState[key])
    .filter((key) => !(key === "others" && equipmentOtherText));

  return (
    <DialogContent className="w-full h-full md:w-auto md:h-auto md:max-w-2xl md:max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-2xl font-semibold">Edit Booking</DialogTitle>
        <DialogDescription>Update booking details: date, time, participants, and purpose.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">Facility</Label>
            <div className="py-2 px-3 bg-gray-50 border rounded text-sm text-gray-800">
              {selectedFacility?.name || ""}
            </div>
          </div>

          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-2">Participants</Label>
            <div className="flex items-center gap-3">
              <NumberInputWithControls
                value={participants}
                min={1}
                max={maxCapacity}
                onChange={(value) => {
                  setParticipants(value);
                  clearWarnings();
                }}
              />
              <div className="text-xs text-muted-foreground">Max: {maxCapacity}</div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <div className="py-2 px-3 bg-gray-50 border rounded text-sm text-gray-800">{formatDate(startTime)}</div>
              </div>

              <div>
                <Label className="invisible">Start Time</Label>
                <div className="py-2 px-3 bg-gray-50 border rounded text-sm text-gray-800">{formatTime(startTime)}</div>
              </div>
            </div>
          </div>

          <div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-700">End Date</Label>
                <div className="py-2 px-3 bg-gray-50 border rounded text-sm text-gray-800">{formatDate(endTime)}</div>
              </div>

              <div>
                <Label className="invisible">End Time</Label>
                <div className="py-2 px-3 bg-gray-50 border rounded text-sm text-gray-800">{formatTime(endTime)}</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Additional Equipment or Needs</label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              {EQUIPMENT_OPTIONS.slice(0, 3).map((option) => (
                <label key={option.key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!equipmentState[option.key]}
                    onChange={(event) => {
                      setEquipmentState((prev) => ({ ...prev, [option.key]: event.target.checked }));
                      clearWarnings();
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>

            <div className="space-y-3">
              {EQUIPMENT_OPTIONS.slice(3, 5).map((option) => (
                <label key={option.key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!equipmentState[option.key]}
                    onChange={(event) => {
                      setEquipmentState((prev) => ({ ...prev, [option.key]: event.target.checked }));
                      clearWarnings();
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={!!equipmentState["others"]}
                  onChange={(event) => {
                    setEquipmentState((prev) => ({ ...prev, others: event.target.checked }));
                    clearWarnings();
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Others</span>
              </div>

              <Input
                value={equipmentOtherText}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  let value = event.target.value;
                  if (value.length > OTHERS_MAX) value = value.slice(0, OTHERS_MAX);
                  setEquipmentOtherText(value);
                  setEquipmentState((prev) => ({ ...prev, others: value.trim().length > 0 }));
                  clearWarnings();
                }}
                placeholder="Describe other needs"
                aria-label="Other equipment details"
                className="w-full"
                maxLength={OTHERS_MAX}
              />
              {equipmentOtherText ? (
                <div className="text-xs text-gray-500">
                  {equipmentOtherText.length}/{OTHERS_MAX}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-2">Purpose</Label>
          <CustomTextarea
            value={purpose}
            onChange={(value) => {
              if (value && value.length > PURPOSE_MAX) {
                setPurpose(value.slice(0, PURPOSE_MAX));
              } else {
                setPurpose(value);
              }
              if (purposeError) setPurposeError("");
              clearWarnings();
            }}
            placeholder="Describe your purpose for booking this facility"
            maxLength={PURPOSE_MAX}
            isInvalid={purpose.length >= PURPOSE_MAX}
          />
          {purpose.length >= PURPOSE_MAX && (
            <div className="text-xs text-red-600 mt-1">Maximum length reached ({PURPOSE_MAX} characters)</div>
          )}
          {purposeError && <div className="text-sm text-red-600 mt-1">{purposeError}</div>}
        </div>

        <div className="mt-4">
          <Label className="block text-sm font-medium text-gray-700 mb-2">
            Course &amp; Year/Department <span className="text-red-500">*</span>
          </Label>
          <CustomTextarea
            value={courseYearDept}
            onChange={(value) => {
              if (value && value.length > COURSE_MAX) {
                setCourseYearDept(value.slice(0, COURSE_MAX));
              } else {
                setCourseYearDept(value);
              }
              clearWarnings();
            }}
            placeholder="e.g. BSIT 3rd Year, Faculty of Engineering, etc."
            maxLength={COURSE_MAX}
            isInvalid={!!(courseYearDept && courseYearDept.length >= COURSE_MAX)}
            className="h-9 resize-none"
            rows={1}
          />
          {courseYearDept && courseYearDept.length >= COURSE_MAX && (
            <div className="text-xs text-red-600 mt-1">Maximum length reached ({COURSE_MAX} characters)</div>
          )}
        </div>

        {formValidationWarnings.length > 0 && (
          <div id="edit-booking-form-errors" className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-red-700">
              <TriangleAlert className="h-5 w-5" />
              <span className="font-semibold">Please review the following issues</span>
            </div>
            <div className="space-y-2">
              {formValidationWarnings.map((warning, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">{warning.title}</p>
                    <p className="text-sm text-red-700">{warning.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {(selectedFacility || startTime || endTime || purpose) && (
        <div className="border-t pt-6 mt-6">
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
                  <span className="text-sm font-medium">{formatDate(startTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Time:</span>
                  <span className="text-sm font-medium">
                    {formatTime(startTime)} - {formatTime(endTime)}
                  </span>
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
                <div className="text-left text-sm font-medium text-gray-900 bg-white p-2 rounded border" style={{ wordWrap: "break-word", overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "pre-wrap", maxWidth: "100%", overflow: "hidden" }}>
                  {purpose}
                </div>
              </div>
            )}

            {courseYearDept && (
              <div className="flex flex-col space-y-1 pt-2 border-t border-gray-200">
                <span className="text-sm text-gray-600">Course &amp; Year/Department:</span>
                <div className="text-left text-sm font-medium text-gray-900 bg-white p-2 rounded border" style={{ wordWrap: "break-word", overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "pre-wrap", maxWidth: "100%", overflow: "hidden" }}>
                  {courseYearDept}
                </div>
              </div>
            )}

            {(selectedEquipmentLabels.length > 0 || equipmentOtherText) && (
              <div className="flex flex-col space-y-1 pt-2 border-t border-gray-200">
                <span className="text-sm text-gray-600">Equipment:</span>
                <div className="text-sm font-medium text-gray-900 bg-white p-2 rounded border" style={{ wordWrap: "break-word", overflowWrap: "anywhere", wordBreak: "break-word", whiteSpace: "pre-wrap", maxWidth: "100%", overflow: "hidden" }}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {selectedEquipmentLabels.map((equipmentKey) => (
                      <div key={`summary-eq-${equipmentKey}`} className="text-sm">
                        {EQUIPMENT_OPTIONS.find((option) => option.key === equipmentKey)?.label || equipmentKey}
                      </div>
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
        <div className="w-full space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <Button
                variant="outline"
                onClick={() => {
                  setCourseYearDept(initialState.courseYearDept);
                  setPurpose(initialState.purpose);
                  clearWarnings();
                  onClose();
                }}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
            <div className="flex-1">
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={isSubmitting || !isDurationValid(startTime, endTime)}
                className="w-full"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500">
            {!isDurationValid(startTime, endTime) ? (
              <span className="text-red-600"> Bookings must be at least 30 minutes long.</span>
            ) : (
              <span>Any validation or submission errors will appear below.</span>
            )}
          </div>
        </div>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Update</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to save changes to this booking?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowConfirmDialog(false);
                  handleSave();
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Confirm"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogFooter>
    </DialogContent>
  );
}

export default function EditBookingModal({
  isOpen,
  onClose,
  booking,
  facilities,
  onSave,
}: EditBookingModalProps) {
  const initialState = useMemo(() => deriveInitialBookingState(booking), [booking]);
  const resetKey = useMemo(
    () => (booking?.id != null ? `booking-${booking.id}` : `booking-new-${isOpen ? "open" : "closed"}`),
    [booking?.id, isOpen]
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <EditBookingModalContent
        key={resetKey}
        booking={booking}
        facilities={facilities}
        onClose={onClose}
        onSave={onSave}
        initialState={initialState}
      />
    </Dialog>
  );
}

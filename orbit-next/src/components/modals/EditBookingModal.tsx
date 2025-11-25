import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Plus, Minus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/ui";
import { CustomTextarea } from "@/components/ui/custom-textarea";
import { apiRequest } from "@/lib/api";
import ValidationSummary, {
  type ConflictEntry,
  type WarningMessage,
} from "./ValidationSummary";
import {
  BOOKING_MAX_DURATION_MINUTES,
  BOOKING_MAX_DURATION_MS,
  BOOKING_MIN_DURATION_MINUTES,
  BOOKING_MIN_DURATION_MS,
} from "@shared/bookingRules";

const PURPOSE_MAX = 200;
const COURSE_MAX = 100;
const OTHERS_MAX = 50;
const SUBMISSION_COOLDOWN = 2000;

const LIBRARY_OPEN_HOUR = 7;
const LIBRARY_OPEN_MINUTE = 30;
const LIBRARY_CLOSE_HOUR = 19;
const LIBRARY_CLOSE_MINUTE = 0;

const getLibraryWindow = (reference: Date) => {
  const open = new Date(reference);
  open.setHours(LIBRARY_OPEN_HOUR, LIBRARY_OPEN_MINUTE, 0, 0);
  const close = new Date(reference);
  close.setHours(LIBRARY_CLOSE_HOUR, LIBRARY_CLOSE_MINUTE, 0, 0);
  return { open, close };
};

const formatLibraryHours = () => {
  const sample = new Date();
  const { open, close } = getLibraryWindow(sample);
  return `${format(open, "h:mm a")} - ${format(close, "h:mm a")}`;
};

const isWithinLibraryHours = (date: Date): boolean => {
  const { open, close } = getLibraryWindow(date);
  return date.getTime() >= open.getTime() && date.getTime() <= close.getTime();
};

const clampStartToLibrary = (candidate: Date) => {
  const { open, close } = getLibraryWindow(candidate);
  const latestStart = new Date(Math.max(open.getTime(), close.getTime() - BOOKING_MIN_DURATION_MS));
  if (candidate.getTime() < open.getTime()) return open;
  if (candidate.getTime() > latestStart.getTime()) return latestStart;
  return candidate;
};

const clampEndToLibrary = (start: Date, candidate: Date) => {
  const { close } = getLibraryWindow(start);
  if (candidate.getTime() > close.getTime()) {
    return new Date(close.getTime());
  }
  if (candidate.getTime() <= start.getTime()) {
    return new Date(start.getTime() + BOOKING_MIN_DURATION_MS);
  }
  return candidate;
};

const normalizeEndTime = (start: Date, candidate: Date) => {
  let normalized = clampEndToLibrary(start, candidate);
  let diff = normalized.getTime() - start.getTime();

  if (diff < BOOKING_MIN_DURATION_MS) {
    normalized = clampEndToLibrary(start, new Date(start.getTime() + BOOKING_MIN_DURATION_MS));
    diff = normalized.getTime() - start.getTime();
  }

  if (diff > BOOKING_MAX_DURATION_MS) {
    normalized = clampEndToLibrary(start, new Date(start.getTime() + BOOKING_MAX_DURATION_MS));
  }

  return normalized;
};

const EQUIPMENT_OPTIONS = [
  { key: "whiteboard", label: "Whiteboard & Markers" },
  { key: "projector", label: "Projector" },
  { key: "extension_cord", label: "Extension Cord" },
  { key: "hdmi", label: "HDMI Cable" },
  { key: "extra_chairs", label: "Extra Chairs" },
  { key: "others", label: "Others" },
] as const;

const getNow = () => Date.now();

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
    startTime = new Date(Math.max(now.getTime(), startTime.getTime()));
  }
  startTime = clampStartToLibrary(startTime);

  const baseEnd = booking?.endTime ? new Date(booking.endTime) : new Date(startTime.getTime() + BOOKING_MIN_DURATION_MS);
  let endTime = normalizeEndTime(startTime, baseEnd);

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
  isOpen: boolean;
}

function EditBookingModalContent({
  booking,
  facilities,
  onClose,
  onSave,
  initialState,
  isOpen,
}: EditBookingModalContentProps) {
  const { toast } = useToast();
  const [purpose, setPurpose] = useState(initialState.purpose);
  const [courseYearDept, setCourseYearDept] = useState(initialState.courseYearDept);
  const facilityId = initialState.facilityId;
  const [startTime, setStartTime] = useState<Date | undefined>(initialState.startTime);
  const [endTime, setEndTime] = useState<Date | undefined>(initialState.endTime);
  const [participants, setParticipants] = useState(initialState.participants);
  const [equipmentState, setEquipmentState] = useState<Record<string, boolean>>({ ...initialState.equipmentState });
  const [equipmentOtherText, setEquipmentOtherText] = useState(initialState.equipmentOtherText);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmissionTime, setLastSubmissionTime] = useState(0);
  const [purposeError, setPurposeError] = useState("");
  const [formValidationWarnings, setFormValidationWarnings] = useState<WarningMessage[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [lockedSlot, setLockedSlot] = useState<{
    holdId: string;
    facilityId: number;
    startTime: string;
    endTime: string;
    expiresAt: string;
  } | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  const [holdConflicts, setHoldConflicts] = useState<ConflictEntry[] | null>(null);
  const holdRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestHoldRequestRef = useRef(0);
  const failedHoldSignatureRef = useRef<string | null>(null);
  const latestHoldIdRef = useRef<string | null>(null);

  const selectedFacility = useMemo(() => {
    return facilityId ? facilities.find((f) => f.id === parseInt(facilityId, 10)) ?? null : null;
  }, [facilities, facilityId]);

  const maxCapacity = useMemo(() => getFacilityMaxCapacity(selectedFacility), [selectedFacility]);

  const formatBookingConflictMessage = useCallback((errorMessage: string) => {
    try {
      const readablePart = errorMessage.split('. Existing booking:')[0];
      if (errorMessage.includes('Existing booking:') && errorMessage.includes('/')) {
        const dateTimeMatch = errorMessage.match(/(\d{1,2}\/\d{1,2}\/\d{4}[^\"]*)/);
        if (dateTimeMatch) {
          return `${readablePart}. Your existing booking: ${dateTimeMatch[1]}`;
        }
      }
      const cleanMessage = readablePart
        .replace(/\s*\{\".*$/g, '')
        .replace(/\s*Please cancel your existing booking first.*$/g, '')
        .trim();
      return `${cleanMessage}. Please cancel your existing booking first or choose a different time.`;
    } catch (error) {
      return errorMessage
        .split('{"')[0]
        .replace(/ID:[^,\s]*/g, '')
        .trim();
    }
  }, []);

  type SerializedSlotHold = {
    id: string;
    facilityId?: number;
    startTime?: string;
    endTime?: string;
    expiresAt: string;
  };
  const clearHoldRefreshTimer = useCallback(() => {
    if (holdRefreshTimeoutRef.current) {
      clearTimeout(holdRefreshTimeoutRef.current);
      holdRefreshTimeoutRef.current = null;
    }
  }, []);

  const releaseHold = useCallback(async () => {
    clearHoldRefreshTimer();
    const targetHoldId = latestHoldIdRef.current;
    latestHoldIdRef.current = null;
    setLockedSlot(null);
    if (!targetHoldId) return;
    try {
      await apiRequest("DELETE", `/api/booking-holds?holdId=${encodeURIComponent(targetHoldId)}`);
    } catch (error) {
      console.warn("[EditBookingModal] Failed to release slot hold", error);
    }
  }, [clearHoldRefreshTimer]);

  const ensureSlotHoldRef = useRef<(() => Promise<void>) | null>(null);

  const scheduleHoldRefresh = useCallback(
    (hold: SerializedSlotHold) => {
      clearHoldRefreshTimer();
      const expiresAtMs = new Date(hold.expiresAt).getTime();
      if (!Number.isFinite(expiresAtMs)) return;
      const refreshDelay = Math.max(expiresAtMs - Date.now() - 15_000, 5_000);
      holdRefreshTimeoutRef.current = setTimeout(async () => {
        try {
          const resp = await apiRequest("PATCH", "/api/booking-holds", { holdId: hold.id });
          const data = await resp.json();
          const refreshed: SerializedSlotHold | undefined = data?.hold;
          if (!refreshed) throw new Error("Missing slot hold data");
          latestHoldIdRef.current = refreshed.id;
          failedHoldSignatureRef.current = null;
          setLockedSlot((prev) => {
            if (!prev) {
              return {
                holdId: refreshed.id,
                facilityId: refreshed.facilityId ?? hold.facilityId ?? 0,
                startTime: refreshed.startTime ?? hold.startTime ?? "",
                endTime: refreshed.endTime ?? hold.endTime ?? "",
                expiresAt: refreshed.expiresAt,
              };
            }
            if (prev.holdId === refreshed.id) {
              return { ...prev, expiresAt: refreshed.expiresAt };
            }
            return { ...prev, holdId: refreshed.id, expiresAt: refreshed.expiresAt };
          });
          scheduleHoldRefresh({
            id: refreshed.id,
            facilityId: refreshed.facilityId ?? hold.facilityId,
            startTime: refreshed.startTime ?? hold.startTime,
            endTime: refreshed.endTime ?? hold.endTime,
            expiresAt: refreshed.expiresAt,
          });
        } catch (error) {
          console.warn("[EditBookingModal] Failed to refresh slot hold", error);
          clearHoldRefreshTimer();
          latestHoldIdRef.current = null;
          setLockedSlot(null);
          setHoldConflicts(null);
          setLockError("Slot hold expired. Attempting to reacquire...");
          failedHoldSignatureRef.current = null;
          ensureSlotHoldRef.current?.();
        }
      }, refreshDelay);
    },
    [clearHoldRefreshTimer],
  );

  const ensureSlotHold = useCallback(async () => {
    if (!isOpen) {
      return;
    }

    const start = startTime;
    const end = endTime;
    const facilityIdStr = facilityId;

    if (!start || !end || !facilityIdStr) {
      failedHoldSignatureRef.current = null;
      setHoldConflicts(null);
      setLockError(null);
      await releaseHold();
      return;
    }

    if (!(start instanceof Date) || Number.isNaN(start.getTime()) || !(end instanceof Date) || Number.isNaN(end.getTime())) {
      failedHoldSignatureRef.current = null;
      setHoldConflicts(null);
      setLockError(null);
      await releaseHold();
      return;
    }

    const facilityIdNum = parseInt(facilityIdStr, 10);
    if (Number.isNaN(facilityIdNum)) {
      failedHoldSignatureRef.current = null;
      setHoldConflicts(null);
      setLockError(null);
      await releaseHold();
      return;
    }

    const normalizedStart = new Date(start);
    const normalizedEnd = new Date(end);
    const desiredSignature = `${facilityIdNum}|${normalizedStart.toISOString()}|${normalizedEnd.toISOString()}`;
    const currentSignature = lockedSlot
      ? `${lockedSlot.facilityId}|${lockedSlot.startTime}|${lockedSlot.endTime}`
      : null;

    if (lockedSlot && currentSignature === desiredSignature) {
      if (!holdRefreshTimeoutRef.current) {
        scheduleHoldRefresh({
          id: lockedSlot.holdId,
          facilityId: lockedSlot.facilityId,
          startTime: lockedSlot.startTime,
          endTime: lockedSlot.endTime,
          expiresAt: lockedSlot.expiresAt,
        });
      }
      return;
    }

    if (failedHoldSignatureRef.current === desiredSignature) {
      return;
    }

    clearHoldRefreshTimer();
    const requestId = Date.now();
    latestHoldRequestRef.current = requestId;

    try {
      const resp = await apiRequest("POST", "/api/booking-holds", {
        holdId: lockedSlot?.holdId,
        facilityId: facilityIdNum,
        startTime: normalizedStart.toISOString(),
        endTime: normalizedEnd.toISOString(),
      });
      const data = await resp.json();
      if (latestHoldRequestRef.current !== requestId) return;
      const hold: SerializedSlotHold | undefined = data?.hold;
      if (!hold) throw new Error("Missing slot hold data");

      latestHoldIdRef.current = hold.id;
      failedHoldSignatureRef.current = null;
      setHoldConflicts(null);
      setLockError(null);
      setLockedSlot({
        holdId: hold.id,
        facilityId: hold.facilityId ?? facilityIdNum,
        startTime: hold.startTime ?? normalizedStart.toISOString(),
        endTime: hold.endTime ?? normalizedEnd.toISOString(),
        expiresAt: hold.expiresAt,
      });
      scheduleHoldRefresh({
        id: hold.id,
        facilityId: hold.facilityId ?? facilityIdNum,
        startTime: hold.startTime ?? normalizedStart.toISOString(),
        endTime: hold.endTime ?? normalizedEnd.toISOString(),
        expiresAt: hold.expiresAt,
      });
    } catch (error: any) {
      if (latestHoldRequestRef.current !== requestId) return;

      const previousHoldId = lockedSlot?.holdId;
      latestHoldIdRef.current = null;
      setLockedSlot(null);
      if (previousHoldId) {
        try {
          await apiRequest("DELETE", `/api/booking-holds?holdId=${encodeURIComponent(previousHoldId)}`);
        } catch (releaseError) {
          console.warn("[EditBookingModal] Failed to release previous hold", releaseError);
        }
      }

      failedHoldSignatureRef.current = desiredSignature;
      let errorMessage = "Unable to reserve the selected time slot.";
      let conflicts: ConflictEntry[] | null = null;

      const payload = error?.payload;
      if (payload) {
        if (payload.message) {
          errorMessage = payload.message;
        }
        if (Array.isArray(payload.conflictingBookings)) {
          const facilityName = selectedFacility?.name || `Facility ${facilityIdNum}`;
          conflicts = payload.conflictingBookings.map((booking: any) => ({
            id: booking.id,
            startTime: booking.startTime,
            endTime: booking.endTime,
            facilityName,
            status: booking.status,
          }));
        }
        if (payload.conflictingHoldExpiresAt) {
          const expiresAt = new Date(payload.conflictingHoldExpiresAt);
          if (!Number.isNaN(expiresAt.getTime())) {
            errorMessage = `Another user is currently holding this slot until ${format(expiresAt, "MMM d, yyyy h:mm a")}.`;
          }
        }
      } else if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }

      setHoldConflicts(conflicts);
      setLockError(errorMessage);
    }
  }, [
    isOpen,
    startTime,
    endTime,
    facilityId,
    lockedSlot,
    selectedFacility,
    scheduleHoldRefresh,
    clearHoldRefreshTimer,
  ]);

  useEffect(() => {
    ensureSlotHoldRef.current = ensureSlotHold;
  }, [ensureSlotHold]);

  const startTimeMs = startTime ? startTime.getTime() : null;
  const endTimeMs = endTime ? endTime.getTime() : null;

  useEffect(() => {
    if (!isOpen) {
      failedHoldSignatureRef.current = null;
      setHoldConflicts(null);
      setLockError(null);
      void releaseHold();
      return;
    }

    void ensureSlotHold();
  }, [
    isOpen,
    startTimeMs,
    endTimeMs,
    facilityId,
    ensureSlotHold,
    releaseHold,
  ]);

  useEffect(() => {
    return () => {
      failedHoldSignatureRef.current = null;
      void releaseHold();
    };
  }, [releaseHold]);


  const clearWarnings = () => {
    if (formValidationWarnings.length > 0) {
      setFormValidationWarnings([]);
    }
  };

  const isDurationValid = (start?: Date, end?: Date) => {
    if (!start || !end) return false;
    const diff = end.getTime() - start.getTime();
    return diff >= BOOKING_MIN_DURATION_MS && diff <= BOOKING_MAX_DURATION_MS;
  };

  const calculateDuration = (start?: Date, end?: Date) => {
    if (!start || !end) return "";
    const diff = end.getTime() - start.getTime();
    if (diff <= 0) return "";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Fetch all bookings to support validation rules (e.g., daily limits for collaborative rooms)
  const { data: allBookingsRaw } = useQuery<any[]>({
    queryKey: ["editBookingModal", "allBookings"],
    queryFn: async () => {
      const resp = await apiRequest("GET", "/api/bookings?includeUser=true");
      return resp.json();
    },
    staleTime: 30_000,
    enabled: isOpen,
  });
  const allBookings = useMemo(() => allBookingsRaw ?? [], [allBookingsRaw]);

  // Real-time validation function
  const validateFormRealtime = useCallback(() => {
    const validationErrors: Array<{ title: string; description: string }> = [];

    if (!facilityId || !startTime || !endTime) {
      return validationErrors;
    }

    if (!purpose.trim()) {
      validationErrors.push({
        title: "Purpose Required",
        description: "Please provide a purpose for your booking.",
      });
    }

    if (startTime.getTime() < Date.now()) {
      validationErrors.push({
        title: "Invalid Start Time",
        description: "Start time cannot be in the past. Please select a future time.",
      });
    }

    const startTimeValid = isWithinLibraryHours(startTime);
    const endTimeValid = isWithinLibraryHours(endTime);

    if (!startTimeValid || !endTimeValid) {
      const timeIssues: string[] = [];
      if (!startTimeValid) timeIssues.push("start time");
      if (!endTimeValid) timeIssues.push("end time");
      validationErrors.push({
        title: "Outside School Hours",
        description: `Your ${timeIssues.join(" and ")} ${timeIssues.length > 1 ? "are" : "is"} outside school operating hours (${formatLibraryHours()}). Room access is only available during these hours.`,
      });
    }

    if (endTime.getTime() <= startTime.getTime()) {
      validationErrors.push({
        title: "Invalid Time Selection",
        description: "Invalid time selection. The start time must be earlier than the end time.",
      });
    }

    const diff = endTime.getTime() - startTime.getTime();
    const durationMinutes = diff / (1000 * 60);

    if (diff > 0 && diff < BOOKING_MIN_DURATION_MS) {
      validationErrors.push({
        title: "Booking Too Short",
        description: `Bookings must be at least ${BOOKING_MIN_DURATION_MINUTES} minutes long. Your current booking is ${Math.floor(durationMinutes)} minutes.`,
      });
    }

    // Facility-specific duration validation
    const facility = facilities.find((f) => f.id === parseInt(facilityId, 10));
    if (facility) {
      const facilityName = facility.name.toLowerCase();
      const isCollabRoom = facilityName.includes('collaborative learning room 1') || facilityName.includes('collaborative learning room 2');
      const durationHours = diff / (1000 * 60 * 60);

      if (isCollabRoom && durationHours > 2) {
        validationErrors.push({
          title: "Duration Limit Exceeded",
          description: `Collaborative Learning Rooms can only be booked for a maximum of 2 hours. Your current booking is ${durationHours.toFixed(1)} hours. Please reduce your booking duration.`,
        });
      } else if (!isCollabRoom && diff > BOOKING_MAX_DURATION_MS) {
        validationErrors.push({
          title: "Maximum Duration Exceeded",
          description: `Bookings cannot exceed ${BOOKING_MAX_DURATION_MINUTES} minutes (${BOOKING_MAX_DURATION_MINUTES / 60} hours). Your current booking is ${Math.floor(durationMinutes)} minutes.`,
        });
      }

      // Check daily booking limit for collaborative learning rooms
      // TEMPORARILY DISABLED FOR TESTING
      /*
      if (isCollabRoom && allBookings && booking) {
        const startOfDay = new Date(startTime);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startTime);
        endOfDay.setHours(23, 59, 59, 999);

        const userBookingsToday = allBookings.filter((b: any) => {
          const bookingStart = new Date(b.startTime);
          return (
            b.userId === booking.userId &&
            b.facilityId === parseInt(facilityId, 10) &&
            (b.status === 'approved' || b.status === 'pending') &&
            b.id !== booking.id &&
            bookingStart >= startOfDay &&
            bookingStart <= endOfDay
          );
        });

        if (userBookingsToday.length >= 2) {
          validationErrors.push({
            title: "Daily Booking Limit Reached",
            description: `You can only book this Collaborative Learning Room twice per day. You already have ${userBookingsToday.length} booking(s) for today. Please choose a different room or date.`,
          });
        }
      }
      */

      const capacity = getFacilityMaxCapacity(facility);
      if (participants > capacity) {
        validationErrors.push({
          title: "Capacity Exceeded",
          description: `The selected room has a maximum capacity of ${capacity} people. Please reduce the number of participants to ${capacity} or fewer.`,
        });
      }
    }

    const sameDay =
      startTime.getFullYear() === endTime.getFullYear() &&
      startTime.getMonth() === endTime.getMonth() &&
      startTime.getDate() === endTime.getDate();
    if (!sameDay) {
      validationErrors.push({
        title: "Single-Day Booking Required",
        description: "Bookings must start and end on the same calendar day. Please split multi-day events into separate bookings.",
      });
    }

    return validationErrors;
  }, [facilityId, startTime, endTime, purpose, participants, facilities, allBookings, booking]);

  // Watch for changes and validate in real-time
  useEffect(() => {
    if (facilityId && startTime && endTime) {
      const errors = validateFormRealtime();
      setFormValidationWarnings(errors);
    } else {
      setFormValidationWarnings([]);
    }
  }, [facilityId, startTime, endTime, purpose, participants, validateFormRealtime]);

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

    // Re-validate on submit
    const validationErrors = validateFormRealtime();

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
      const messages: Array<{ title: string; description: string }> = [];
      if (!startTime || !endTime) {
        messages.push({ title: "Invalid Duration", description: "Start and end times are required." });
      } else {
        const diff = endTime.getTime() - startTime.getTime();
        if (diff < BOOKING_MIN_DURATION_MS) {
          messages.push({
            title: "Invalid Duration",
            description: `Bookings must be at least ${BOOKING_MIN_DURATION_MINUTES} minutes long.`,
          });
        }
        if (diff > BOOKING_MAX_DURATION_MS) {
          messages.push({
            title: "Maximum Duration Exceeded",
            description: `Bookings cannot exceed ${BOOKING_MAX_DURATION_MINUTES} minutes.`,
          });
        }
      }
      setFormValidationWarnings(messages);
      try {
        document.getElementById("edit-booking-form-errors")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (error) {
        /* ignore scroll errors */
      }
      return;
    }

    setFormValidationWarnings([]);
    setIsSubmitting(true);

    const holdIdForSubmission = lockedSlot?.holdId;

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
        holdId: holdIdForSubmission,
      };

      await onSave(payload);
      await releaseHold();
      setIsSubmitting(false);
      setLastSubmissionTime(getNow());
      onClose();
    } catch (error: any) {
      setIsSubmitting(false);
      if (holdIdForSubmission) {
        failedHoldSignatureRef.current = `${facilityId}|${startTime?.toISOString()}|${endTime?.toISOString()}`;
      }
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
    <DialogContent className="w-full h-[100dvh] md:w-auto md:h-auto md:max-w-2xl max-h-[100dvh] md:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
      <DialogHeader>
        <DialogTitle className="text-xl sm:text-2xl font-semibold">Edit Booking</DialogTitle>
        <DialogDescription className="text-sm">Update booking details: date, time, participants, and purpose.</DialogDescription>
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

        {/* ValidationSummary removed - slot hold conflicts disabled */}
        {formValidationWarnings.length > 0 && (
          <div id="edit-booking-form-errors" className="mt-3 text-sm rounded-b-lg px-4 py-3 bg-white border-t border-gray-200">
            {formValidationWarnings.map((w, idx) => (
              <div key={idx} className="mb-2 flex items-start gap-3">
                <div className="mt-0.5 text-yellow-600 text-xl">⚠️</div>
                <div>
                  <div className="font-semibold text-red-700 text-sm">{w.title}</div>
                  <div className="text-red-600 text-sm mt-1">{w.description}</div>
                </div>
              </div>
            ))}
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
              <span className="text-red-600"> Bookings must be between {BOOKING_MIN_DURATION_MINUTES} and {BOOKING_MAX_DURATION_MINUTES} minutes long.</span>
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
        isOpen={isOpen}
      />
    </Dialog>
  );
}

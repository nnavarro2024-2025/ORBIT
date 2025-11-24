import { CustomTextarea } from "@/components/ui/custom-textarea";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/ui";
import { useAuth } from "@/hooks/data";
import { Calendar as CalendarIcon, Plus, Minus, Send, X, Loader2, TriangleAlert } from "lucide-react"; // Added Plus, Minus, Send, X, Loader2, TriangleAlert icons
import type { Facility } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { cn } from "@/lib/utils/utils";
import { Switch } from "@/components/ui/switch";
import {
  BOOKING_MAX_DURATION_MINUTES,
  BOOKING_MAX_DURATION_MS,
  BOOKING_MIN_DURATION_MINUTES,
  BOOKING_MIN_DURATION_MS,
} from "@shared/bookingRules";
import {
  type ConflictEntry,
  type WarningMessage,
} from "./ValidationSummary";

// Small helper: return a short description for known facility names
const getFacilityDescriptionByName = (name?: string) => {
  if (!name) return '';
  const lower = name.toLowerCase();
  if (lower.includes('collaborative learning room 1') || lower.includes('collaborative learning room 2') || lower.includes('collaborative learning')) {
    return 'Group study space (up to 8 people)';
  }
  if (lower.includes('board room') || lower.includes('boardroom')) {
    return 'Meeting room (up to 12 people)';
  }
  return 'Study space for individual or small groups';
};

const PREVIEW_LIMIT = 10; // upper bound for small previews inside modals

const LIBRARY_OPEN_HOUR = 7;
const LIBRARY_OPEN_MINUTE = 30;
const LIBRARY_CLOSE_HOUR = 19;
const LIBRARY_CLOSE_MINUTE = 0;
const SLOT_INTERVAL_MINUTES = 30;

const startOfDay = (value: Date) => {
  const copy = new Date(value);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const isSameCalendarDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

const isDateBeforeToday = (value: Date) => startOfDay(value).getTime() < startOfDay(new Date()).getTime();

const getLibraryWindow = (reference: Date) => {
  const open = new Date(reference);
  open.setHours(LIBRARY_OPEN_HOUR, LIBRARY_OPEN_MINUTE, 0, 0);
  const close = new Date(reference);
  close.setHours(LIBRARY_CLOSE_HOUR, LIBRARY_CLOSE_MINUTE, 0, 0);
  return { open, close };
};

const roundUpToInterval = (value: Date, minutes: number) => {
  const result = new Date(value);
  result.setSeconds(0, 0);
  const intervalMs = minutes * 60 * 1000;
  const remainder = result.getTime() % intervalMs;
  if (remainder === 0) return result;
  result.setTime(result.getTime() + (intervalMs - remainder));
  return result;
};

const clampStartToLibrary = (candidate: Date) => {
  const { open, close } = getLibraryWindow(candidate);
  const latestStart = new Date(Math.max(open.getTime(), close.getTime() - BOOKING_MIN_DURATION_MS));
  if (candidate.getTime() < open.getTime()) return open;
  if (candidate.getTime() > latestStart.getTime()) return latestStart;
  return candidate;
};

const clampEndToLibrary = (candidate: Date, start: Date) => {
  const { close } = getLibraryWindow(start);
  if (candidate.getTime() > close.getTime()) return close;
  if (candidate.getTime() <= start.getTime()) {
    return new Date(Math.min(close.getTime(), start.getTime() + BOOKING_MIN_DURATION_MS));
  }
  return candidate;
};

const getNextAvailableStart = () => {
  const now = new Date();
  const { open: todayOpen, close: todayClose } = getLibraryWindow(now);
  if (now.getTime() < todayOpen.getTime()) {
    return todayOpen;
  }
  if (now.getTime() >= todayClose.getTime()) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { open: tomorrowOpen } = getLibraryWindow(tomorrow);
    return tomorrowOpen;
  }
  const rounded = roundUpToInterval(now, SLOT_INTERVAL_MINUTES);
  if (rounded.getTime() > todayClose.getTime()) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { open: tomorrowOpen } = getLibraryWindow(tomorrow);
    return tomorrowOpen;
  }
  return clampStartToLibrary(rounded);
};

const normalizeStartTime = (candidate: Date) => {
  let normalized = clampStartToLibrary(roundUpToInterval(candidate, SLOT_INTERVAL_MINUTES));
  const now = new Date();

  if (isSameCalendarDay(normalized, now) && normalized.getTime() < now.getTime()) {
    const next = clampStartToLibrary(roundUpToInterval(now, SLOT_INTERVAL_MINUTES));
    const { close } = getLibraryWindow(now);
    if (next.getTime() <= close.getTime()) {
      normalized = next;
    } else {
      normalized = clampStartToLibrary(getNextAvailableStart());
    }
  }

  return normalized;
};

const normalizeEndTime = (start: Date, candidate?: Date | null) => {
  const base = candidate ? new Date(candidate) : new Date(start.getTime() + BOOKING_MIN_DURATION_MS);
  let normalized = clampEndToLibrary(base, start);
  let diff = normalized.getTime() - start.getTime();

  if (diff < BOOKING_MIN_DURATION_MS) {
    normalized = clampEndToLibrary(new Date(start.getTime() + BOOKING_MIN_DURATION_MS), start);
    diff = normalized.getTime() - start.getTime();
  }

  if (diff > BOOKING_MAX_DURATION_MS) {
    normalized = clampEndToLibrary(new Date(start.getTime() + BOOKING_MAX_DURATION_MS), start);
  }

  return normalized;
};

// Custom Number Input with Controls
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

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilities: Facility[];
  selectedFacilityId?: number | null;
  initialStartTime?: Date | null;
  initialEndTime?: Date | null;
  showSuggestedSlot?: boolean;
}

export default function BookingModal({
  isOpen,
  onClose,
  facilities,
  selectedFacilityId,
  initialStartTime = null,
  initialEndTime = null,
}: BookingModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmissionTime, setLastSubmissionTime] = useState(0);
  const SUBMISSION_COOLDOWN = 2000; // 2 seconds cooldown between submissions
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  // NOTE: Removed client-side blocking for existing bookings. Server-side
  // validation will surface conflicts after submit; the modal will show
  // inline errors beneath the form. Keeping only lightweight helpers.

  // Get all current bookings to show facility availability
  const { data: allBookingsRaw } = useQuery<any[]>({
    queryKey: ["/api/bookings/all"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bookings/all");
      return response.json();
    },
    enabled: isOpen, // Only fetch when modal is open
  });

  const allBookings = useMemo(() => allBookingsRaw ?? [], [allBookingsRaw]);

  // Note: server-side validation is authoritative for overlapping/limit rules.
  // We intentionally avoid preemptive client-side blocking which can cause UX
  // surprises and duplicate-check race conditions.

  const predefinedFacilities = [
    { id: 1, name: "Collaborative Learning Room 1", isActive: true, capacity: 8 },
    { id: 2, name: "Collaborative Learning Room 2", isActive: true, capacity: 8 },
    { id: 3, name: "Board Room", isActive: true, capacity: 12 },
  ];

  const allFacilities = useMemo(() => (facilities.length > 0 ? facilities : predefinedFacilities), [facilities]);
  // Filter facilities based on user role
  const visibleFacilities = useMemo(() => {
    return allFacilities.filter(facility => {
      if (!facility.isActive) return false;
      
      const name = String(facility.name || '').toLowerCase();
      const restricted = /board room|boardroom|lounge/.test(name);
      const userRole = user?.role || 'student';
      
      // Admin sees everything
      if (userRole === 'admin') return true;
      
      // Faculty sees ONLY Board Room and Faculty Lounge
      if (userRole === 'faculty') {
        return restricted; // Only show restricted facilities
      }
      
      // Students see only non-restricted facilities
      return !restricted;
    });
  }, [allFacilities, user?.role]);
  const fallbackFacilities = visibleFacilities;
  const fallbackFacilitiesKey = useMemo(
    () => fallbackFacilities.map((facility) => facility.id).join("|"),
    [fallbackFacilities]
  );

  const getFacilityMaxCapacity = useCallback((facility?: Facility | { id: number; name: string; isActive: boolean; capacity: number; } | null) => {
    if (!facility) return 8; // Default fallback for unknown facilities
    // Problem 3 Fix: Better null safety - ensure capacity is a valid number
    const capacity = facility.capacity;
    return (typeof capacity === 'number' && capacity > 0) ? capacity : 8;
  }, []);

  const getFacilityCurrentStatus = useCallback((facilityId: number) => {
    const now = new Date();
    
    // Check for both pending and approved bookings to show accurate facility status
    const blockingStatuses = ["approved", "pending"];
    const facilityBookings = allBookings.filter((booking: any) => 
      booking.facilityId === facilityId && 
      blockingStatuses.includes(booking.status) &&
      new Date(booking.endTime) > now
    ).sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    if (facilityBookings.length === 0) return null;

    // Check for currently active booking (only approved bookings can be "active")
    const activeBooking = facilityBookings.find((booking: any) => {
      const start = new Date(booking.startTime);
      const end = new Date(booking.endTime);
      return booking.status === "approved" && now >= start && now <= end;
    });

    if (activeBooking) {
      return {
        type: "active",
        message: `Currently in use until ${new Date(activeBooking.endTime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })}`,
        booking: activeBooking
      };
    }

    // Check for upcoming bookings (both pending and approved)
    const upcomingBookings = facilityBookings.filter((booking: any) => 
      blockingStatuses.includes(booking.status) && new Date(booking.startTime) > now
    );

    if (upcomingBookings.length > 0) {
      return {
        type: "upcoming",
        message: `${upcomingBookings.length} upcoming booking${upcomingBookings.length > 1 ? 's' : ''}`,
        bookings: upcomingBookings
      };
    }

    return null;
  }, [allBookings]);

  // getUserFacilityBookings removed - server-side checks are authoritative and
  // this client helper was unused. Kept logic centralized on server/storage.ts.

  const isWithinLibraryHours = (date: Date): boolean => {
    const { open, close } = getLibraryWindow(date);
    return date.getTime() >= open.getTime() && date.getTime() <= close.getTime();
  };

  const formatLibraryHours = (): string => {
    const sample = new Date();
    const { open, close } = getLibraryWindow(sample);
    const openLabel = format(open, "h:mm a");
    const closeLabel = format(close, "h:mm a");
    return `${openLabel} - ${closeLabel}`;
  };

  const createBookingSchema = () => z
    .object({
      facilityId: z.string().min(1, "Please select a facility"),
      startTime: z.date({
        message: "A start date and time is required.",
      }),
      endTime: z.date({
        message: "An end date and time is required.",
      }),
      purpose: z.string().min(1, "Purpose is required"),
      courseYearDept: z.string().min(1, "Course & Year/Department is required"),
      participants: z.number().min(1, "Number of participants is required"),
      reminderOptIn: z.boolean().optional(),
      reminderLeadMinutes: z.number().optional(),
    })
    .superRefine((val, ctx) => {
      try {
        if (val.startTime && val.endTime) {
          const diff = val.endTime.getTime() - val.startTime.getTime();
          if (diff <= 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End time must be after start time', path: ['endTime'] });
          } else {
            if (diff < BOOKING_MIN_DURATION_MS) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Bookings must be at least ${BOOKING_MIN_DURATION_MINUTES} minutes long`, path: ['endTime'] });
            }
            if (diff > BOOKING_MAX_DURATION_MS) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Bookings cannot exceed ${BOOKING_MAX_DURATION_MINUTES} minutes`, path: ['endTime'] });
            }
          }
        }
      } catch (e) {
        // ignore
      }
    });

  const bookingSchema = createBookingSchema();
  type BookingFormData = z.infer<typeof bookingSchema>;

  // Equipment checklist state
  const EQUIPMENT_OPTIONS = [
    { key: 'whiteboard', label: 'Whiteboard & Markers' },
    { key: 'projector', label: 'Projector' },
    { key: 'extension_cord', label: 'Extension Cord' },
    { key: 'hdmi', label: 'HDMI Cable' },
    { key: 'extra_chairs', label: 'Extra Chairs' },
    // NOTE: 'others' removed from options array - it's handled separately via equipmentOtherText field
  ];
  // equipmentState values: 'prepared' | 'not_available' | false
  type EquipmentStateValue = 'prepared' | 'not_available' | false;
  const [equipmentState, setEquipmentState] = useState<Record<string, EquipmentStateValue>>(() => {
    const init: Record<string, EquipmentStateValue> = {};
    EQUIPMENT_OPTIONS.forEach(o => init[o.key] = false);
    return init;
  });
  const [equipmentOtherText, setEquipmentOtherText] = useState('');
  const PURPOSE_MAX = 200;
  const COURSE_MAX = 100;
  const OTHERS_MAX = 50;
  const REMINDER_LEAD_MINUTES = 60;

  const defaultStartTime = useMemo(() => {
    if (initialStartTime) {
      return clampStartToLibrary(new Date(initialStartTime));
    }
    return clampStartToLibrary(getNextAvailableStart());
  }, [initialStartTime]);

  const defaultEndTime = useMemo(() => {
    const base = initialEndTime
      ? new Date(initialEndTime)
      : new Date(defaultStartTime.getTime() + BOOKING_MIN_DURATION_MS);
    return clampEndToLibrary(base, defaultStartTime);
  }, [initialEndTime, defaultStartTime]);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    mode: 'onChange',
    defaultValues: {
      facilityId: "",
      startTime: defaultStartTime,
      endTime: defaultEndTime,
      purpose: "",
      courseYearDept: "",
      participants: 1,
      reminderOptIn: true,
      reminderLeadMinutes: REMINDER_LEAD_MINUTES,
    },
  });

  const reminderOptIn = form.watch("reminderOptIn") ?? true;

  // If the modal receives new initial times while open, update the form fields
  useEffect(() => {
    if (!isOpen) return;

    if (initialStartTime) {
      const normalizedStart = normalizeStartTime(new Date(initialStartTime));
      const currentStart = form.getValues('startTime');
      const currentStartMs = currentStart instanceof Date ? currentStart.getTime() : undefined;
      const nextStartMs = normalizedStart.getTime();
      if (currentStartMs !== nextStartMs) {
        form.setValue('startTime', normalizedStart);
      }
    }

    if (initialEndTime) {
      const baseStart = form.getValues('startTime') || defaultStartTime;
      const normalizedEnd = normalizeEndTime(baseStart, new Date(initialEndTime));
      const currentEnd = form.getValues('endTime');
      const currentEndMs = currentEnd instanceof Date ? currentEnd.getTime() : undefined;
      const nextEndMs = normalizedEnd.getTime();
      if (currentEndMs !== nextEndMs) {
        form.setValue('endTime', normalizedEnd);
      }
    }
  }, [isOpen, initialStartTime, initialEndTime, form]);

  const [formValidationWarnings, setFormValidationWarnings] = useState<WarningMessage[]>([]);
  // Track whether the user manually edited the date/time so we don't overwrite their choices
  const [userEditedTime, setUserEditedTime] = useState(false);
  const isSelectingSlotRef = useRef(false);
  type AvailableSlot = { start: Date; end: Date; source: "api" | "fallback" };
  const slotCacheRef = useRef<Map<string, AvailableSlot[]>>(new Map());
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
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

  const startTimeValue = form.watch("startTime");
  const endTimeValue = form.watch("endTime");
  const facilityIdValue = form.watch("facilityId");

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

  const releaseHold = useCallback(
    async (holdId?: string) => {
      clearHoldRefreshTimer();
      const targetHoldId = holdId ?? latestHoldIdRef.current;
      latestHoldIdRef.current = null;
      setLockedSlot(null);
      if (!targetHoldId) {
        return;
      }
      try {
        await apiRequest(
          "DELETE",
          `/api/booking-holds?holdId=${encodeURIComponent(targetHoldId)}`,
        );
      } catch (error) {
        console.warn("[BookingModal] Failed to release slot hold", error);
      }
    },
    [clearHoldRefreshTimer],
  );

  const ensureSlotHoldRef = useRef<(() => Promise<void>) | null>(null);

  const scheduleHoldRefresh = useCallback(
    (hold: SerializedSlotHold) => {
      clearHoldRefreshTimer();
      const expiresAtMs = new Date(hold.expiresAt).getTime();
      if (!Number.isFinite(expiresAtMs)) {
        return;
      }
      const refreshDelay = Math.max(expiresAtMs - Date.now() - 15_000, 5_000);
      holdRefreshTimeoutRef.current = setTimeout(async () => {
        try {
          const resp = await apiRequest("PATCH", "/api/booking-holds", {
            holdId: hold.id,
          });
          const data = await resp.json();
          const refreshed: SerializedSlotHold | undefined = data?.hold;
          if (!refreshed) {
            throw new Error("Missing slot hold data");
          }
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
            return {
              ...prev,
              holdId: refreshed.id,
              expiresAt: refreshed.expiresAt,
            };
          });
          scheduleHoldRefresh({
            id: refreshed.id,
            facilityId: refreshed.facilityId ?? hold.facilityId,
            startTime: refreshed.startTime ?? hold.startTime,
            endTime: refreshed.endTime ?? hold.endTime,
            expiresAt: refreshed.expiresAt,
          });
        } catch (error) {
          console.warn("[BookingModal] Failed to refresh slot hold", error);
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

    const facilityIdStr = facilityIdValue;
    const start = startTimeValue instanceof Date ? startTimeValue : null;
    const end = endTimeValue instanceof Date ? endTimeValue : null;

    if (!facilityIdStr || !start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      failedHoldSignatureRef.current = null;
      setHoldConflicts(null);
      setLockError(null);
      await releaseHold();
      return;
    }

    const facilityId = parseInt(facilityIdStr, 10);
    if (Number.isNaN(facilityId)) {
      failedHoldSignatureRef.current = null;
      setHoldConflicts(null);
      setLockError(null);
      await releaseHold();
      return;
    }

    const normalizedStart = new Date(start);
    const normalizedEnd = new Date(end);
    const desiredSignature = `${facilityId}|${normalizedStart.toISOString()}|${normalizedEnd.toISOString()}`;
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
        facilityId,
        startTime: normalizedStart.toISOString(),
        endTime: normalizedEnd.toISOString(),
      });
      const data = await resp.json();
      if (latestHoldRequestRef.current !== requestId) return;
      const hold: SerializedSlotHold | undefined = data?.hold;
      if (!hold) {
        throw new Error("Missing slot hold data");
      }

      latestHoldIdRef.current = hold.id;
      failedHoldSignatureRef.current = null;
      setHoldConflicts(null);
      setLockError(null);
      setLockedSlot({
        holdId: hold.id,
        facilityId: hold.facilityId ?? facilityId,
        startTime: hold.startTime ?? normalizedStart.toISOString(),
        endTime: hold.endTime ?? normalizedEnd.toISOString(),
        expiresAt: hold.expiresAt,
      });
      scheduleHoldRefresh({
        id: hold.id,
        facilityId: hold.facilityId ?? facilityId,
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
        await releaseHold(previousHoldId);
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
          const facilityName = selectedFacility?.name || `Facility ${facilityId}`;
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
    facilityIdValue,
    startTimeValue,
    endTimeValue,
    lockedSlot,
    selectedFacility,
    releaseHold,
    scheduleHoldRefresh,
    clearHoldRefreshTimer,
  ]);

  useEffect(() => {
    ensureSlotHoldRef.current = ensureSlotHold;
  }, [ensureSlotHold]);

  const startTimeMs = startTimeValue instanceof Date ? startTimeValue.getTime() : null;
  const endTimeMs = endTimeValue instanceof Date ? endTimeValue.getTime() : null;

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
    facilityIdValue,
    startTimeMs,
    endTimeMs,
    ensureSlotHold,
    releaseHold,
  ]);

  useEffect(() => {
    return () => {
      failedHoldSignatureRef.current = null;
      void releaseHold();
    };
  }, [releaseHold]);

  const selectedDateKey = startTimeValue ? format(startTimeValue, "yyyy-MM-dd") : null;

  const computeFallbackSlots = useCallback((facilityIdNum: number, dateKey: string): AvailableSlot[] => {
    try {
      const [yearStr, monthStr, dayStr] = dateKey.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1;
      const day = parseInt(dayStr, 10);
      const startWindow = new Date(year, month, day, 7, 30, 0, 0);
      const endWindow = new Date(year, month, day, 19, 0, 0, 0);
      const SLOT_MS = 30 * 60 * 1000;
      const slots: AvailableSlot[] = [];
      const blockingStatuses = new Set(["approved", "pending"]);
      const facilityBookings = (allBookings || []).filter((booking: any) => booking.facilityId === facilityIdNum && blockingStatuses.has(booking.status));

      for (let cursor = new Date(startWindow); cursor.getTime() < endWindow.getTime(); cursor = new Date(cursor.getTime() + SLOT_MS)) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(cursor.getTime() + SLOT_MS);
        
        // Skip slots that extend beyond library hours
        if (slotEnd.getTime() > endWindow.getTime()) {
          break;
        }
        
        const conflict = facilityBookings.some((booking: any) => {
          const existingStart = new Date(booking.startTime).getTime();
          const existingEnd = new Date(booking.endTime).getTime();
          return slotStart.getTime() < existingEnd && slotEnd.getTime() > existingStart;
        });

        if (!conflict) {
          slots.push({ start: slotStart, end: slotEnd, source: "fallback" });
        }
      }

      return slots;
    } catch (error) {
      console.warn('[BookingModal] Failed to build fallback slots', error);
      return [];
    }
  }, [allBookings]);

  useEffect(() => {
    slotCacheRef.current.clear();
  }, [allBookings]);

  useEffect(() => {
    if (!isOpen) {
      setAvailableSlots((prev) => (prev.length > 0 ? [] : prev));
      setSlotsError((prev) => (prev === null ? prev : null));
      setSlotsLoading((prev) => (prev ? false : prev));
      return;
    }

    if (!facilityIdValue || !selectedDateKey) {
      setAvailableSlots((prev) => (prev.length > 0 ? [] : prev));
      setSlotsError((prev) => (prev === null ? prev : null));
      setSlotsLoading((prev) => (prev ? false : prev));
      return;
    }

    const facilityIdNum = parseInt(facilityIdValue, 10);
    if (Number.isNaN(facilityIdNum)) {
      setAvailableSlots((prev) => (prev.length > 0 ? [] : prev));
      setSlotsError((prev) => (prev === null ? prev : null));
      setSlotsLoading((prev) => (prev ? false : prev));
      return;
    }

    const cacheKey = `${facilityIdNum}-${selectedDateKey}`;
    if (slotCacheRef.current.has(cacheKey)) {
      const cachedSlots = slotCacheRef.current.get(cacheKey) ?? [];
      setAvailableSlots(cachedSlots);
      setSlotsError(cachedSlots.length === 0 ? "No available time slots for this date." : null);
      setSlotsLoading(false);
      return;
    }

    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(null);

    const loadSlots = async () => {
      try {
        const resp = await apiRequest('GET', `/api/availability?date=${selectedDateKey}`);
        const json = await resp.json();
        const facilityEntry = Array.isArray(json?.data)
          ? json.data.find((entry: any) => entry?.facility?.id === facilityIdNum)
          : null;

        const now = new Date();
        const todayKey = format(now, "yyyy-MM-dd");
        const isToday = todayKey === selectedDateKey;

        let slots: AvailableSlot[] = [];
        if (facilityEntry && Array.isArray(facilityEntry.slots)) {
          slots = facilityEntry.slots
            .filter((slot: any) => slot?.status === 'available')
            .map((slot: any) => ({ start: new Date(slot.start), end: new Date(slot.end), source: "api" as const }))
            .filter((slot: AvailableSlot) => {
              // Ensure slots are within library hours (7:30 AM - 7:00 PM)
              const hour = slot.start.getHours();
              const minute = slot.start.getMinutes();
              const startMinutes = hour * 60 + minute;
              const libraryOpenMinutes = 7 * 60 + 30; // 7:30 AM
              const libraryCloseMinutes = 19 * 60; // 7:00 PM
              return startMinutes >= libraryOpenMinutes && startMinutes < libraryCloseMinutes;
            });
        }

        if (slots.length === 0) {
          slots = computeFallbackSlots(facilityIdNum, selectedDateKey);
        }

        if (isToday) {
          slots = slots.filter((slot) => slot.end.getTime() > now.getTime() && slot.start.getTime() >= now.getTime());
        }

        slots.sort((a, b) => a.start.getTime() - b.start.getTime());

        if (!cancelled) {
          slotCacheRef.current.set(cacheKey, slots);
          setAvailableSlots(slots);
          setSlotsError(slots.length === 0 ? "No available time slots for this date." : null);
        }
      } catch (error) {
        console.warn('[BookingModal] Failed to load availability slots', error);
        if (!cancelled) {
          setAvailableSlots([]);
          setSlotsError("Unable to load available time slots. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setSlotsLoading(false);
        }
      }
    };

    loadSlots();

    return () => {
      cancelled = true;
    };
  }, [isOpen, facilityIdValue, selectedDateKey, computeFallbackSlots]);

  // Track if we've already auto-filled the initial slot
  const hasAutoFilledRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      hasAutoFilledRef.current = false; // Reset when modal closes
      setUserEditedTime(false); // Reset user edited state when modal closes
      return;
    }
    
    // Skip auto-fill if user has manually selected a time or we've already auto-filled
    if (userEditedTime || hasAutoFilledRef.current) return;
    if (availableSlots.length === 0) return;

    const currentStart = form.getValues('startTime');
    const currentEnd = form.getValues('endTime');
    
    // Only auto-fill if no valid time is currently set
    if (currentStart && currentEnd) {
      const { open, close } = getLibraryWindow(currentStart);
      const isValidTime = currentStart.getTime() >= open.getTime() && 
                         currentEnd.getTime() <= close.getTime();
      if (isValidTime) {
        hasAutoFilledRef.current = true; // Mark as filled
        return; // Keep existing valid time
      }
    }

    // Only auto-fill the first time the modal opens or when the date changes
    if (!hasAutoFilledRef.current) {
      const firstSlot = availableSlots[0];
      if (firstSlot) {
        const normalizedStart = new Date(firstSlot.start);
        const normalizedEnd = new Date(firstSlot.end);
        
        // Only update if the values are actually different
        const currentStartTime = currentStart?.getTime();
        const currentEndTime = currentEnd?.getTime();
        
        if (currentStartTime !== normalizedStart.getTime() || currentEndTime !== normalizedEnd.getTime()) {
          form.setValue('startTime', normalizedStart, { shouldValidate: true });
          form.setValue('endTime', normalizedEnd, { shouldValidate: true });
        }
        
        hasAutoFilledRef.current = true;
      }
    }
  }, [availableSlots, userEditedTime, isOpen, form]);

  const handleSlotSelect = useCallback((slot: AvailableSlot) => {
    // Set userEditedTime to true to prevent auto-fill from overriding the selection
    setUserEditedTime(true);
    
    // Set the flag to indicate we're in the middle of a slot selection
    isSelectingSlotRef.current = true;
    
    // Use batch updates to prevent intermediate renders
    form.setValue('startTime', new Date(slot.start), { 
      shouldValidate: true, 
      shouldDirty: true,
      shouldTouch: true
    });
    form.setValue('endTime', new Date(slot.end), { 
      shouldValidate: true, 
      shouldDirty: true,
      shouldTouch: true
    });
    
    setLockError(null);
    
    // Keep the flag set longer to ensure all effects complete
    setTimeout(() => {
      isSelectingSlotRef.current = false;
    }, 1000);
  }, [form]);

  const isSlotSelected = useCallback((slot: AvailableSlot) => {
    if (!startTimeValue || !slot) return false;
    
    // Compare both start and end times to ensure we have an exact match
    const slotStart = new Date(slot.start).getTime();
    const slotEnd = new Date(slot.end).getTime();
    const currentStart = startTimeValue.getTime();
    const currentEnd = endTimeValue?.getTime();
    
    return (
      Math.abs(currentStart - slotStart) < 60 * 1000 && 
      (!currentEnd || Math.abs(currentEnd - slotEnd) < 60 * 1000)
    );
  }, [startTimeValue, endTimeValue]);

  const computeDurationMs = (start?: Date | null, end?: Date | null) => {
    if (!start || !end) return 0;
    return Math.max(0, end.getTime() - start.getTime());
  };

  const durationMs = computeDurationMs(startTimeValue, endTimeValue);
  const durationMinutes = durationMs / 60000;
  const isBelowMinDuration = durationMs > 0 && durationMs < BOOKING_MIN_DURATION_MS;
  const exceedsMaxDuration = durationMs > BOOKING_MAX_DURATION_MS;

  useEffect(() => {
    if (!startTimeValue) return;
    if (isSelectingSlotRef.current) return; // Don't interfere during slot selection
    if (userEditedTime) return; // Don't override user's manual selection
    
    // Check if current time matches an available slot (don't normalize valid slot selections)
    const matchesSlot = availableSlots.some(slot => 
      Math.abs(slot.start.getTime() - startTimeValue.getTime()) < 1000
    );
    if (matchesSlot) return; // This is a valid slot selection, don't touch it
    
    // Check if the current time is already valid (within library hours, proper interval)
    const { open, close } = getLibraryWindow(startTimeValue);
    const isWithinHours = startTimeValue.getTime() >= open.getTime() && startTimeValue.getTime() < close.getTime();
    const minutes = startTimeValue.getMinutes();
    const isProperInterval = minutes === 0 || minutes === 30;
    
    if (isWithinHours && isProperInterval) {
      // Time is already valid, just ensure end time is set
      const currentEnd = form.getValues("endTime");
      if (!currentEnd) {
        const normalizedEnd = normalizeEndTime(startTimeValue, undefined);
        form.setValue("endTime", normalizedEnd, { shouldDirty: true });
      }
      return;
    }
    
    // Only normalize if time is actually invalid
    const normalizedStart = normalizeStartTime(new Date(startTimeValue));
    if (normalizedStart.getTime() !== startTimeValue.getTime()) {
      form.setValue("startTime", normalizedStart, { shouldDirty: true });
      return;
    }

    const currentEnd = form.getValues("endTime");
    const normalizedEnd = normalizeEndTime(normalizedStart, currentEnd ?? undefined);
    if (!currentEnd || normalizedEnd.getTime() !== currentEnd.getTime()) {
      form.setValue("endTime", normalizedEnd, { shouldDirty: true });
    }
  }, [startTimeValue, form, userEditedTime, availableSlots]);

  useEffect(() => {
    if (!startTimeValue || !endTimeValue) return;
    if (isSelectingSlotRef.current) return; // Don't interfere during slot selection
    if (userEditedTime) return; // Don't override user's manual selection
    
    // Check if current time matches an available slot (don't normalize valid slot selections)
    const matchesSlot = availableSlots.some(slot => 
      Math.abs(slot.start.getTime() - startTimeValue.getTime()) < 1000 &&
      Math.abs(slot.end.getTime() - endTimeValue.getTime()) < 1000
    );
    if (matchesSlot) return; // This is a valid slot selection, don't touch it
    
    // Check if end time is valid (after start, within library hours, proper duration)
    const { close } = getLibraryWindow(startTimeValue);
    const duration = endTimeValue.getTime() - startTimeValue.getTime();
    const isAfterStart = endTimeValue.getTime() > startTimeValue.getTime();
    const isWithinHours = endTimeValue.getTime() <= close.getTime();
    const isValidDuration = duration >= BOOKING_MIN_DURATION_MS && duration <= BOOKING_MAX_DURATION_MS;
    
    if (isAfterStart && isWithinHours && isValidDuration) {
      return; // End time is already valid
    }
    
    // Only normalize if end time is actually invalid
    const normalizedEnd = normalizeEndTime(new Date(startTimeValue), new Date(endTimeValue));
    if (normalizedEnd.getTime() !== endTimeValue.getTime()) {
      form.setValue("endTime", normalizedEnd, { shouldDirty: true });
    }
  }, [startTimeValue, endTimeValue, form, userEditedTime, availableSlots]);

  // Dev-only debug: log current user's bookings when modal opens or facility changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    try {
      if (!isOpen) return;
      const currentEmail = String(user?.email || '').toLowerCase();
      const userBookings = (allBookings || []).filter((b: any) => String(b.userEmail || b.user?.email || '').toLowerCase() === currentEmail);
      console.debug('[DEV] BookingModal - userBookings:', userBookings.map((b: any) => ({ id: b.id, status: b.status, facilityId: b.facilityId, startTime: b.startTime, endTime: b.endTime })));
      const facilityIdWatch = form.getValues('facilityId');
      if (facilityIdWatch) {
        const facId = parseInt(facilityIdWatch);
        const currentFacBookings = userBookings.filter((b: any) => b.facilityId === facId);
        console.debug('[DEV] BookingModal - user bookings for selected facility:', currentFacBookings.map((b: any) => ({ id: b.id, status: b.status })));
      }
    } catch (e) {}
  }, [isOpen, allBookings, user]);

  // Clear inline warnings when relevant form fields change
  useEffect(() => {
    const subscription = form.watch((_, { name }) => {
      if (["startTime", "endTime", "facilityId", "participants", "purpose"].includes(name as string)) {
        // Clear warnings whenever relevant fields change, but only if there are
        // warnings to clear. This avoids unnecessary setState calls which can
        // trigger cascading re-renders and potential infinite loops.
        setFormValidationWarnings(prev => (prev && prev.length > 0) ? [] : prev);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Helper: round up a date to the next 30-minute boundary
  const roundUpToNext30 = (d: Date) => {
    const out = new Date(d);
    out.setSeconds(0, 0);
    const mins = out.getMinutes();
    const rem = mins % 30;
    if (rem === 0) return out;
    out.setMinutes(mins + (30 - rem));
    return out;
  };

  // Find next available 30-minute slot for a given facility, searching today then next day
  const findNextAvailableSlot = useCallback(async (facilityId: number | null, fromDate = new Date()): Promise<{ start: Date; end: Date } | null> => {
    if (!facilityId) return null;
    const MAX_DAYS = 2; // today and next day
    const SLOT_MS = 30 * 60 * 1000;

    for (let dayOffset = 0; dayOffset < MAX_DAYS; dayOffset++) {
      const candidateDay = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + dayOffset, 0, 0, 0, 0);
      const startWindow = new Date(candidateDay.getFullYear(), candidateDay.getMonth(), candidateDay.getDate(), 7, 30, 0, 0);
      const endWindow = new Date(candidateDay.getFullYear(), candidateDay.getMonth(), candidateDay.getDate(), 19, 0, 0, 0);

      // Query server availability for this day to get authoritative slots
      try {
        const dateStr = candidateDay.toISOString().slice(0,10);
        const resp = await apiRequest('GET', `/api/availability?date=${dateStr}`);
        const availJson = await resp.json();
        const facilityEntry = Array.isArray(availJson?.data) ? availJson.data.find((d: any) => d.facility && d.facility.id === facilityId) : null;
        if (facilityEntry && Array.isArray(facilityEntry.slots)) {
          // Look for the first 'available' slot starting at or after 'fromDate' (rounded to 30)
          const normalizedFrom = dayOffset === 0 ? roundUpToNext30(new Date(Math.max(fromDate.getTime(), Date.now()))) : startWindow;
          for (const slot of facilityEntry.slots) {
            try {
              if (slot.status !== 'available') continue;
              const slotStart = new Date(slot.start);
              const slotEnd = new Date(slot.end);
              if (slotStart.getTime() >= normalizedFrom.getTime() && slotEnd.getTime() <= endWindow.getTime()) {
                // Return first available 30-min block
                return { start: slotStart, end: slotEnd };
              }
            } catch (e) { /* ignore parse errors */ }
          }
        }
      } catch (e) {
        // If availability API fails, fall back to the client-side search below
      }

      // Fallback to client-side search (checks pending and approved bookings) if availability API not usable
      let cursor = dayOffset === 0 ? roundUpToNext30(new Date(Math.max(fromDate.getTime(), Date.now()))) : new Date(startWindow);
      if (cursor < startWindow) cursor = new Date(startWindow);
      while (cursor.getTime() + SLOT_MS <= endWindow.getTime()) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(cursor.getTime() + SLOT_MS);

        // check conflicts against pending AND approved bookings for this facility
        const blockingStatuses = ['approved', 'pending'];
        const facilityBookings = (allBookings || []).filter((b: any) => 
          b.facilityId === facilityId && blockingStatuses.includes(b.status)
        );
        const conflict = facilityBookings.some((b: any) => {
          const s = new Date(b.startTime).getTime();
          const e = new Date(b.endTime).getTime();
          return slotStart.getTime() < e && slotEnd.getTime() > s;
        });

        if (!conflict) {
          return { start: slotStart, end: slotEnd };
        }

        cursor = new Date(cursor.getTime() + SLOT_MS);
      }
    }
    return null;
  }, [allBookings]);

  const handleFacilityChange = useCallback((facilityId: string) => {
    const facility = facilities.find((f) => f.id === parseInt(facilityId));

    if (facility) {
      setSelectedFacility((prev) => {
        if (prev && prev.id === facility.id) {
          return prev;
        }
        return facility;
      });
    } else {
      setSelectedFacility((prev) => (prev ? null : prev));
    }

    // Cap participants to selected facility's max
    const currentParticipants = form.getValues("participants");
    const maxCap = getFacilityMaxCapacity(facility || null);
    if (currentParticipants > maxCap) {
      form.setValue("participants", maxCap);
    }

    // If the user hasn't manually edited the time, auto-fill the next available slot for this facility
    if (!userEditedTime) {
      (async () => {
        try {
          const facId = facility ? facility.id : null;
          if (!facId) return;
          const next = await findNextAvailableSlot(facId, new Date());
          if (next) {
            // programmatic set should not mark as user-edited
            form.setValue('startTime', next.start);
            form.setValue('endTime', next.end);
          }
        } catch (e) { /* ignore */ }
      })();
    }
  }, [facilities, form, getFacilityMaxCapacity, userEditedTime, findNextAvailableSlot]);

  // Auto-select facility when modal opens with a specific facility ID
  useEffect(() => {
    if (!isOpen) return;

    if (selectedFacilityId) {
      const facility = facilities.find((f) => f.id === selectedFacilityId);
      if (facility && facility.isActive) {
        const facilityIdString = facility.id.toString();
        const currentFacilityId = form.getValues('facilityId');
        const facilityChanged = currentFacilityId !== facilityIdString;
        const selectionChanged = selectedFacility?.id !== facility.id;

        if (selectionChanged) {
          setSelectedFacility(facility);
        }

        if (facilityChanged) {
          form.setValue('facilityId', facilityIdString);
          handleFacilityChange(facilityIdString);
        } else if (selectionChanged) {
          handleFacilityChange(facilityIdString);
        }
      }
      return;
    }

    const currentFacilityId = form.getValues('facilityId');
    if (currentFacilityId) {
      if (!selectedFacility || selectedFacility.id.toString() !== currentFacilityId) {
        const facility = facilities.find((f) => f.id.toString() === currentFacilityId) || null;
        if (facility?.isActive) {
          setSelectedFacility(facility);
        } else if (selectedFacility) {
          setSelectedFacility(null);
        }
      }
      return;
    }

    const firstFallback = fallbackFacilities[0];
    if (firstFallback) {
      const firstId = firstFallback.id.toString();
      const currentId = form.getValues('facilityId');
      const selectionMatches = selectedFacility?.id === firstFallback.id;

      if (currentId !== firstId) {
        form.setValue('facilityId', firstId);
        handleFacilityChange(firstId);
      } else if (!selectionMatches) {
        handleFacilityChange(firstId);
      }
    }
  }, [
    isOpen,
    selectedFacilityId,
    facilities,
    fallbackFacilitiesKey,
    form,
    handleFacilityChange,
    selectedFacility,
  ]);

  // Helper: build detailed conflict description from server payload
  const buildConflictDescription = (payload: any, baseMessage: string) => {
    try {
      if (!payload) return baseMessage;
      const facilityName = payload?.facility?.name || 'Selected facility';
      const conflicts = Array.isArray(payload?.conflictingBookings) ? payload.conflictingBookings : [];
      const formatted = conflicts.map((c: any) => {
        try {
          const s = new Date(c.startTime);
            const e = new Date(c.endTime);
            const day = s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const st = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const et = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `${day} ${st}-${et}`;
        } catch { return ''; }
      }).filter(Boolean);
      if (formatted.length === 0) return `${baseMessage} (${facilityName}).`;
      return `${baseMessage} (${facilityName}). Conflicts: ${formatted.join('; ')}`;
    } catch { return baseMessage; }
  };

  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      setIsSubmitting(true);
      // Rely on server-side validation for existing booking rules. Do not block here.
      // Check if selected facility is available
      const selectedFacility = facilities.find(f => f.id === parseInt(data.facilityId));
      if (!selectedFacility || !selectedFacility.isActive) {
        throw new Error("Selected facility is currently unavailable for booking. Please choose another facility.");
      }

      const preparedItems = Object.keys(equipmentState).filter(k => k !== 'others' && equipmentState[k] === 'prepared');
      
      // DEBUG: Log equipment state
      console.log('=== BOOKING FORM DEBUG ===');
      console.log('equipmentState:', equipmentState);
      console.log('preparedItems:', preparedItems);
      console.log('equipmentOtherText:', equipmentOtherText);
      
      const bookingData = {
        ...data,
        facilityId: parseInt(data.facilityId),
        startTime: data.startTime.toISOString(),
        endTime: data.endTime.toISOString(),
        courseYearDept: data.courseYearDept,
        equipment: {
          items: preparedItems,
          others: equipmentOtherText.trim() || null,
        },
        reminderOptIn: data.reminderOptIn,
        reminderLeadMinutes: data.reminderLeadMinutes,
      };
      
      console.log('Final equipment payload:', bookingData.equipment);
      console.log('=== END DEBUG ===');
      const response = await apiRequest("POST", "/api/bookings", bookingData);
      return response.json();
    },
    onSuccess: async () => {
      // Wait for all cache invalidations to complete before hiding loading state
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/alerts"] }),
      ]);
      setIsSubmitting(false);
      setLastSubmissionTime(Date.now());
      const selectedFacilityName = selectedFacility?.name
        || visibleFacilities.find((facility) => String(facility.id) === form.getValues("facilityId"))?.name
        || "Facility";
      const scheduledStart = form.getValues("startTime");
      const formattedStart = scheduledStart ? new Date(scheduledStart).toLocaleString() : "";
      toast({
        title: "Booking Scheduled",
        description: formattedStart ? `${selectedFacilityName} on ${formattedStart}.` : `${selectedFacilityName} scheduled successfully.`,
        variant: "default",
      });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      console.error("Booking error:", error);
      // If server returned a structured conflict payload, capture it so the
      // UI can offer the user a one-click action to cancel existing bookings
      // and proceed (forceCancelConflicts).
      if (error && error.payload) {
        // Surface user-active/overlap errors inline so they appear under the form.
        const code = String(error.payload.error || '').trim();
        if (code === 'UserHasOverlappingBooking' || code === 'UserHasActiveBooking') {
          const baseMsg = error.payload.message || 'You already have a pending or approved booking that overlaps this time.';
          const detailed = buildConflictDescription(error.payload, baseMsg);
          // Clear existing warnings and show only the server conflict with action button
          setFormValidationWarnings([{ 
            title: 'Conflicting Booking Found', 
            description: detailed + ' You may cancel existing conflicting bookings and proceed below.' 
          }]);
          setServerConflictPayload(error.payload);
          return;
        }

        // Also handle facility-level conflicts returned from the storage layer (ConflictError -> 409 payload)
        if (error.payload && (error.payload.facility || error.payload.conflictingBookings)) {
          const baseMsg = error.payload.message || 'This time slot is already booked by another user.';
          const detailed = buildConflictDescription(error.payload, baseMsg);
          // Clear existing warnings and show only facility conflict
          setFormValidationWarnings([{ title: 'Facility Conflict', description: detailed + ' Please pick another time.' }]);
          setServerConflictPayload(error.payload);
          return;
        }
      }
      
      // Handle daily booking limit error for collaborative rooms - TEMPORARILY DISABLED FOR TESTING
      
      // Handle specific overlapping booking error
      if (error.message && error.message.includes("You already have a booking during this time")) {
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
      }
      // Handle specific conflict error
      else if (error.message && error.message.includes("time slot is already booked")) {
        // Attempt to parse structured payload from server (409 responses)
        let payload = error && error.payload ? error.payload : null;
        // If payload missing, try to parse JSON embedded in the error message
        if (!payload && error?.message) {
          try {
            const candidate = error.message.replace(/^\d+:\s*/, '');
            payload = JSON.parse(candidate);
          } catch (e) {
            // ignore
          }
        }
        if (payload && payload.facility) {
          const facilityName = payload.facility.name || `Facility ${payload.facility.id}`;
          const conflicts = Array.isArray(payload.conflictingBookings) ? payload.conflictingBookings : [];
          const conflictText = conflicts.length > 0
            ? conflicts.map((c: any) => `${new Date(c.startTime).toLocaleString()} - ${new Date(c.endTime).toLocaleString()}`).join('; ')
            : '';
          toast({
            title: "Time Slot Unavailable",
            description: `${facilityName} has a conflicting booking${conflictText ? `: ${conflictText}` : ''}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Time Slot Unavailable",
            description: "This time slot is already booked. Please choose a different time or facility.",
            variant: "destructive",
          });
        }
      }
      // Handle capacity validation error
      else if (error.message && error.message.includes("exceeds facility capacity")) {
        toast({
          title: "Participant Limit Exceeded",
          description: error.message,
          variant: "destructive",
        });
      }
      // NOTE: BookingTooSoon server-side error is intentionally not handled specially here.
      // Treat it as a generic error so the client doesn't surface the old 1-hour policy message.
      else {
        toast({
          title: "Error",
          description: error.message || "An error occurred while creating your booking.",
          variant: "destructive",
        });
      }
    },
  });

  // Server conflict payload (rendered inline instead of dialog)
  const [serverConflictPayload, setServerConflictPayload] = useState<any | null>(null);

  const handleForceCancelAndProceed = async () => {
    if (!confirmPendingData) return;
    try {
      setIsSubmitting(true);
      // Send the same payload with forceCancelConflicts flag so server will cancel user's existing bookings
      const preparedItems = Object.keys(equipmentState).filter(k => k !== 'others' && equipmentState[k] === 'prepared');
      
      const payload = {
        ...confirmPendingData,
        facilityId: parseInt(confirmPendingData.facilityId),
        startTime: confirmPendingData.startTime.toISOString(),
        endTime: confirmPendingData.endTime.toISOString(),
        equipment: {
          items: preparedItems,
          others: equipmentOtherText.trim() || null,
        },
        reminderOptIn: confirmPendingData.reminderOptIn ?? true,
        reminderLeadMinutes: confirmPendingData.reminderLeadMinutes ?? REMINDER_LEAD_MINUTES,
        forceCancelConflicts: true,
      };
      const response = await apiRequest('POST', '/api/bookings', payload);
      await response.json();
      // Wait for cache to update before hiding loading
      await queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({ title: 'Booking Scheduled', description: 'Existing conflicting bookings were cancelled and your booking was scheduled.', variant: 'default' });
      form.reset();
      setServerConflictPayload(null);
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      toast({ title: 'Error', description: err?.message || 'Could not force-cancel conflicts.', variant: 'destructive' });
    }
  };

  // Real-time validation function that runs as form fields change
  const validateFormRealtime = useCallback((data: Partial<BookingFormData>) => {
    const validationErrors: Array<{title: string, description: string}> = [];

    // Only validate if we have the necessary data
    if (!data.startTime || !data.endTime || !data.facilityId) {
      return validationErrors;
    }

    // Validate start time is not in the past
    const currentTime = new Date();
    if (data.startTime.getTime() < currentTime.getTime()) {
      validationErrors.push({
        title: "Invalid Start Time",
        description: "Start time cannot be in the past. Please select a future time.",
      });
    }

    // Validate facility exists
    if (typeof data.facilityId !== 'string') {
      return validationErrors; // facilityId not a string; abort further validation
    }
    const fid = data.facilityId;
    const facility = facilities.find(f => f.id === parseInt(fid, 10));
    if (!facility) {
      validationErrors.push({
        title: "Facility Not Found",
        description: "Please select a valid facility from the list.",
      });
    } else {
      // Validate capacity
      const maxCapacity = facility.capacity || 8;
      if (data.participants && data.participants > maxCapacity) {
        validationErrors.push({
          title: "Capacity Exceeded",
          description: `The selected room has a maximum capacity of ${maxCapacity} people. Please reduce the number of participants to ${maxCapacity} or fewer.`,
        });
      }
    }

    // Validate end time is after start time
    if (data.endTime <= data.startTime) {
      validationErrors.push({
        title: "Invalid Time Selection",
        description: "Invalid time selection. The start time must be earlier than the end time.",
      });
    }

    // Validate same calendar day (no multi-day bookings)
    const sDate = data.startTime;
    const eDate = data.endTime;
    if (sDate.getFullYear() !== eDate.getFullYear() || sDate.getMonth() !== eDate.getMonth() || sDate.getDate() !== eDate.getDate()) {
      validationErrors.push({
        title: "Single-Day Booking Required",
        description: "Bookings must start and end on the same calendar day. Please split multi-day events into separate bookings.",
      });
    }

    // Validate library hours for both start and end time
    const startTimeValid = isWithinLibraryHours(data.startTime);
    const endTimeValid = isWithinLibraryHours(data.endTime);
    
    if (!startTimeValid || !endTimeValid) {
      let timeIssues = [];
      if (!startTimeValid) timeIssues.push("start time");
      if (!endTimeValid) timeIssues.push("end time");
      
      validationErrors.push({
        title: "Outside School Hours",
        description: `Your ${timeIssues.join(" and ")} ${timeIssues.length > 1 ? "are" : "is"} outside school operating hours (${formatLibraryHours()}). Room access is only available during these hours.`,
      });
    }

    // Facility-specific duration validation
    if (facility && data.startTime && data.endTime) {
      const durationMs = data.endTime.getTime() - data.startTime.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      const durationMinutes = durationMs / (1000 * 60);
      const facilityName = facility.name.toLowerCase();
      const isCollabRoom = facilityName.includes('collaborative learning room 1') || facilityName.includes('collaborative learning room 2');
      
      // Minimum duration check
      if (durationMs < BOOKING_MIN_DURATION_MS) {
        validationErrors.push({
          title: "Booking Too Short",
          description: `Bookings must be at least ${BOOKING_MIN_DURATION_MINUTES} minutes long. Your current booking is ${Math.floor(durationMinutes)} minutes.`,
        });
      }
      
      // Maximum duration check (facility-specific)
      if (isCollabRoom && durationHours > 2) {
        validationErrors.push({
          title: "Duration Limit Exceeded",
          description: `Collaborative Learning Rooms can only be booked for a maximum of 2 hours. Your current booking is ${durationHours.toFixed(1)} hours. Please reduce your booking duration.`,
        });
      } else if (!isCollabRoom && durationMs > BOOKING_MAX_DURATION_MS) {
        validationErrors.push({
          title: "Maximum Duration Exceeded",
          description: `Bookings cannot exceed ${BOOKING_MAX_DURATION_MINUTES} minutes (${BOOKING_MAX_DURATION_MINUTES / 60} hours). Your current booking is ${Math.floor(durationMinutes)} minutes. Please reduce your booking duration.`,
        });
      }
      
      // Check daily booking limit for collaborative learning rooms
      // TEMPORARILY DISABLED FOR TESTING
      /*
      if (isCollabRoom && allBookings && user?.email) {
        const startOfDay = new Date(data.startTime);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(data.startTime);
        endOfDay.setHours(23, 59, 59, 999);
        
        const currentEmail = String(user.email).toLowerCase();
        const userBookingsToday = allBookings.filter((b: any) => {
          const bookingStart = new Date(b.startTime);
          const bookingEmail = String(b.userEmail || b.user?.email || '').toLowerCase();
          return (
            bookingEmail === currentEmail &&
            b.facilityId === parseInt(fid, 10) &&
            (b.status === 'approved' || b.status === 'pending') &&
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
    }

    // Validate purpose field
    if (data.purpose !== undefined && data.purpose.trim().length === 0) {
      validationErrors.push({
        title: "Purpose Required",
        description: "Please provide a purpose for your booking. This helps us understand how facilities are being used.",
      });
    }

    return validationErrors;
  }, [facilities, allBookings, user?.email]);

  // Watch form fields and validate in real-time
  useEffect(() => {
    const subscription = form.watch((value) => {
      const data = {
        facilityId: value.facilityId,
        startTime: value.startTime,
        endTime: value.endTime,
        participants: value.participants,
        purpose: value.purpose,
      };
      
      // Only run validation if we have key fields filled
      if (data.facilityId && data.startTime && data.endTime) {
        const errors = validateFormRealtime(data as Partial<BookingFormData>);
        setFormValidationWarnings(errors);
      } else {
        // Clear errors if key fields are empty (user is still filling form)
        setFormValidationWarnings([]);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, validateFormRealtime]);

  const onSubmit = (data: BookingFormData) => {
    // Prevent rapid duplicate submissions
    const now = Date.now();
    if (isSubmitting || (now - lastSubmissionTime < SUBMISSION_COOLDOWN)) {
      toast({
        title: "Please Wait",
        description: "Please wait a moment before submitting another booking.",
        variant: "destructive",
      });
      return;
    }

    // Re-validate on submit to ensure all validations pass
    const validationErrors = validateFormRealtime(data);

    // Show validation errors inline in the modal
    if (validationErrors.length > 0) {
      setFormValidationWarnings(validationErrors);
      try {
        const summary = document.getElementById("booking-form-errors");
        summary?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (e) {
        // ignore scroll failures
      }
      return;
    }

    // Clear any previous inline warnings and proceed to confirmation
    setFormValidationWarnings([]);
    setConfirmPendingData({ ...data, reminderOptIn: data.reminderOptIn ?? reminderOptIn, reminderLeadMinutes: data.reminderLeadMinutes ?? REMINDER_LEAD_MINUTES });
    setShowConfirmDialog(true);
  };

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmPendingData, setConfirmPendingData] = useState<BookingFormData | null>(null);

  // (formatDateTimeDisplay removed - use date-fns `format` directly where needed)

  const checkTimeConflict = () => {
    const startTime = form.watch("startTime");
    const endTime = form.watch("endTime");
    const facilityId = form.watch("facilityId");

    if (!startTime || !endTime || !facilityId || !selectedFacility) return null;

    const facilityBookings = allBookings.filter((booking: any) => 
      booking.facilityId === selectedFacility.id && 
      booking.status === "approved" &&
      new Date(booking.endTime) > new Date() // Only future bookings
    );

    const conflicts = facilityBookings.filter((booking: any) => {
      const existingStart = new Date(booking.startTime);
      const existingEnd = new Date(booking.endTime);
      
      // Check if times overlap
      return startTime < existingEnd && endTime > existingStart;
    });

    return conflicts.length > 0 ? conflicts : null;
  };

  const calculateDuration = (start: Date | undefined, end: Date | undefined) => {
    if (!start || !end) return "";
    const diff = end.getTime() - start.getTime();
    if (diff <= 0) return "";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const isDurationValid = useCallback((start: Date | undefined, end: Date | undefined) => {
    if (!start || !end) return false;
    const diff = end.getTime() - start.getTime();
    return diff >= BOOKING_MIN_DURATION_MS && diff <= BOOKING_MAX_DURATION_MS;
  }, []);

  // Auto-fill an available time slot when the modal opens (today or next day)
  useEffect(() => {
    if (!isOpen) return;

    // determine facility to search
    let facId: number | null = null;
    if (selectedFacilityId) facId = selectedFacilityId;
    else {
      const fv = form.getValues('facilityId');
      facId = fv ? parseInt(fv) : (fallbackFacilities[0]?.id ?? null);
    }

    if (!facId) return;

    (async () => {
      try {
        const currentStart: Date = form.getValues('startTime');
        const currentEnd: Date = form.getValues('endTime');

        // If the caller provided an explicit slot (user clicked a slot), prefer it
        // but only if it's within library hours and doesn't conflict with approved bookings.
        if (!userEditedTime && initialStartTime && initialEndTime) {
          const providedStartValid = isWithinLibraryHours(initialStartTime);
          const providedEndValid = isWithinLibraryHours(initialEndTime);

          // Note: 'scheduled' is a UI display label, not a database status. Schema statuses are: pending, approved, denied, cancelled
          const blockingStatuses = new Set(['approved', 'pending']);
          const providedHasConflict = (allBookings || []).filter((b: any) => b.facilityId === facId && blockingStatuses.has(b.status))
            .some((b: any) => initialStartTime < new Date(b.endTime) && initialEndTime > new Date(b.startTime));

          // Also check availability API for scheduled slots (covers bookings by other accounts)
          const dateStr = initialStartTime.toISOString().slice(0,10);
          let availabilityConflict = false;
          try {
            const availResp = await apiRequest('GET', `/api/availability?date=${dateStr}`);
            const availJson = await availResp.json();
            const facilityEntry = Array.isArray(availJson?.data) ? (availJson.data.find((d: any) => d.facility && d.facility.id === facId)) : null;
            if (facilityEntry) {
              const overlappingSlots = (facilityEntry.slots || []).filter((slot: any) => {
                try {
                  // any slot that isn't explicitly 'available' should be considered blocking (scheduled/unavailable)
                  if (slot.status === 'available') return false;
                  const slotStart = new Date(slot.start);
                  const slotEnd = new Date(slot.end);
                  return initialStartTime < slotEnd && initialEndTime > slotStart;
                } catch (e) { return false; }
              });
              if (overlappingSlots.length > 0) availabilityConflict = true;
            }
          } catch (e) {
            // network or parsing error - do not treat as available; fall back to previous checks
          }

          if (providedStartValid && providedEndValid && !providedHasConflict && !availabilityConflict) {
            // Use the provided slot and do not override with the auto-fill logic.
            // programmatic set - do not mark as user edited
            const latestStart = form.getValues('startTime');
            const latestEnd = form.getValues('endTime');
            const latestStartMs = latestStart instanceof Date ? latestStart.getTime() : undefined;
            const latestEndMs = latestEnd instanceof Date ? latestEnd.getTime() : undefined;
            const nextStartMs = initialStartTime.getTime();
            const nextEndMs = initialEndTime.getTime();

            let updated = false;

            if (latestStartMs !== nextStartMs) {
              form.setValue('startTime', initialStartTime);
              updated = true;
            }

            if (latestEndMs !== nextEndMs) {
              form.setValue('endTime', initialEndTime);
              updated = true;
            }

            if (updated) {
              setUserEditedTime(false);
            }

            return;
          }
          // If the provided slot is invalid (outside hours or conflicting), fall through
          // to find the next available slot below.
        }

        // If current values are outside library hours or conflict with existing bookings,
        // find the next available slot and auto-fill it.
        const startValid = isWithinLibraryHours(currentStart);
        const endValid = isWithinLibraryHours(currentEnd);

        // Note: 'scheduled' is a UI display label, not a database status. Schema statuses are: pending, approved, denied, cancelled
        const blockingStatuses = new Set(['approved', 'pending']);
        const hasConflict = (() => {
          if (!currentStart || !currentEnd) return true;
          const conflicts = (allBookings || []).filter((b: any) => b.facilityId === facId && blockingStatuses.has(b.status))
            .some((b: any) => currentStart < new Date(b.endTime) && currentEnd > new Date(b.startTime));
          return conflicts;
        })();
        if (!userEditedTime && (!startValid || !endValid || hasConflict)) {
          const next = await findNextAvailableSlot(facId, new Date());
          if (next) {
            const latestStart = form.getValues('startTime');
            const latestEnd = form.getValues('endTime');
            const latestStartMs = latestStart instanceof Date ? latestStart.getTime() : undefined;
            const latestEndMs = latestEnd instanceof Date ? latestEnd.getTime() : undefined;
            const nextStartMs = next.start.getTime();
            const nextEndMs = next.end.getTime();

            let updated = false;

            if (latestStartMs !== nextStartMs) {
              form.setValue('startTime', next.start);
              updated = true;
            }

            if (latestEndMs !== nextEndMs) {
              form.setValue('endTime', next.end);
              updated = true;
            }

            if (updated) {
              setUserEditedTime(false);
            }
          }
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [
    isOpen,
    allBookings,
    selectedFacilityId,
    initialStartTime,
    initialEndTime,
    form,
    fallbackFacilities,
    findNextAvailableSlot,
    userEditedTime,
  ]);

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
  <DialogContent className="w-full h-full md:w-auto md:h-auto md:max-w-2xl md:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">New Facility Booking</DialogTitle>
          <DialogDescription>
            Create a new booking by selecting a facility, date, and time. Please follow school hours and room capacity rules.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          {fallbackFacilities.length === 0 ? (
            <div className="text-center py-8">
              <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Facilities Available</h3>
              <p className="text-gray-600 mb-6">
                All facilities are currently unavailable for booking. Please contact an administrator or try again later.
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="facilityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facility</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleFacilityChange(value);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a facility" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {fallbackFacilities.map((f) => (
                            <SelectItem
                              key={f.id}
                              value={f.id.toString()}
                              description={(f as any).description || getFacilityDescriptionByName(f.name)}
                              available={!!(f.isActive && !getFacilityCurrentStatus(f.id))}
                            >
                              {f.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {/* Facility booking limit UI intentionally removed; server-side errors will be shown after submit */}

              <FormField
                control={form.control}
                name="participants"
                render={({ field }) => {
                  const facilityId = form.watch("facilityId");
                  const currentFacility = facilityId ? allFacilities.find(f => f.id === parseInt(facilityId)) : null;
                  const maxCapacity = getFacilityMaxCapacity(currentFacility);

                  return (
                    <FormItem>
                      <FormLabel>Number of Participants</FormLabel>
                      <FormControl>
                        <NumberInputWithControls
                          value={field.value}
                          onChange={(val) => {
                            const numVal = typeof val === 'string' ? parseInt(val, 10) : val;
                            field.onChange(Math.min(numVal, maxCapacity));
                          }}
                          min={1}
                          max={maxCapacity}
                        />
                      </FormControl>
                      <div className="text-xs text-muted-foreground mt-1">
                        Max capacity: {maxCapacity}
                      </div>
                    </FormItem>
                  );
                }}
              />

              {/* Equipment checklist — span both form columns so the three equipment columns have room */}
              <div className="mt-2 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-3">Additional Equipment or Needs</label>

                {/* Use md breakpoint for three balanced columns inside the wider area */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Column 1 - Left */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      {equipmentState['whiteboard'] === 'not_available' ? (
                        <div className="h-4 w-4 flex items-center justify-center rounded-sm border border-red-500 bg-red-50">
                          <X className="h-3 w-3 text-red-600" />
                        </div>
                      ) : (
                        <Checkbox
                          checked={equipmentState['whiteboard'] === 'prepared'}
                          onCheckedChange={(checked) => setEquipmentState(prev => ({ ...prev, ['whiteboard']: checked ? 'prepared' : false }))}
                        />
                      )}
                      <span className="text-sm text-gray-700">Whiteboard &amp; Markers</span>
                    </label>

                    <label className="flex items-center gap-3">
                      {equipmentState['projector'] === 'not_available' ? (
                        <div className="h-4 w-4 flex items-center justify-center rounded-sm border border-red-500 bg-red-50">
                          <X className="h-3 w-3 text-red-600" />
                        </div>
                      ) : (
                        <Checkbox
                          checked={equipmentState['projector'] === 'prepared'}
                          onCheckedChange={(checked) => setEquipmentState(prev => ({ ...prev, ['projector']: checked ? 'prepared' : false }))}
                        />
                      )}
                      <span className="text-sm text-gray-700">Projector</span>
                    </label>

                    <label className="flex items-center gap-3">
                      {equipmentState['extension_cord'] === 'not_available' ? (
                        <div className="h-4 w-4 flex items-center justify-center rounded-sm border border-red-500 bg-red-50">
                          <X className="h-3 w-3 text-red-600" />
                        </div>
                      ) : (
                        <Checkbox
                          checked={equipmentState['extension_cord'] === 'prepared'}
                          onCheckedChange={(checked) => setEquipmentState(prev => ({ ...prev, ['extension_cord']: checked ? 'prepared' : false }))}
                        />
                      )}
                      <span className="text-sm text-gray-700">Extension Cord</span>
                    </label>
                  </div>

                  {/* Column 2 - Middle */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      {equipmentState['hdmi'] === 'not_available' ? (
                        <div className="h-4 w-4 flex items-center justify-center rounded-sm border border-red-500 bg-red-50">
                          <X className="h-3 w-3 text-red-600" />
                        </div>
                      ) : (
                        <Checkbox
                          checked={equipmentState['hdmi'] === 'prepared'}
                          onCheckedChange={(checked) => setEquipmentState(prev => ({ ...prev, ['hdmi']: checked ? 'prepared' : false }))}
                        />
                      )}
                      <span className="text-sm text-gray-700">HDMI Cable</span>
                    </label>

                    <label className="flex items-center gap-3">
                      {equipmentState['extra_chairs'] === 'not_available' ? (
                        <div className="h-4 w-4 flex items-center justify-center rounded-sm border border-red-500 bg-red-50">
                          <X className="h-3 w-3 text-red-600" />
                        </div>
                      ) : (
                        <Checkbox
                          checked={equipmentState['extra_chairs'] === 'prepared'}
                          onCheckedChange={(checked) => setEquipmentState(prev => ({ ...prev, ['extra_chairs']: checked ? 'prepared' : false }))}
                        />
                      )}
                      <span className="text-sm text-gray-700">Extra Chairs</span>
                    </label>
                  </div>

                  {/* Column 3 - Right (Others textarea always present) */}
                  <div className="space-y-2">
                    <div className="mt-2 md:mt-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Others</label>
                      <Input
                        value={equipmentOtherText}
                          onChange={(e: any) => {
                          let val = e.target.value;
                          if (val.length > OTHERS_MAX) val = val.slice(0, OTHERS_MAX);
                          setEquipmentOtherText(val);

                          // Best-effort: if the user pasted JSON-like payload (common in notifications),
                          // try to parse and map statuses for known equipment keys. This prevents raw JSON
                          // from showing up and marks items as 'prepared' or 'not_available' accordingly.
                          try {
                            const firstBrace = val.indexOf('{');
                            const lastBrace = val.lastIndexOf('}');
                            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                              const candidate = val.slice(firstBrace, lastBrace + 1);
                              const parsed = JSON.parse(candidate);
                              const itemsObj = parsed?.items || parsed?.equipment || parsed || null;
                              if (itemsObj && typeof itemsObj === 'object') {
                                const normalized = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                                const map: Record<string, EquipmentStateValue> = {};
                                Object.keys(itemsObj).forEach((k) => {
                                  const norm = normalized(k);
                                  const matched = EQUIPMENT_OPTIONS.find(o => normalized(o.key) === norm || normalized(o.label) === norm);
                                  if (matched) {
                                    const rawVal = String(itemsObj[k] ?? '').toLowerCase();
                                    if (rawVal.includes('not_av') || rawVal.includes('not available') || rawVal.includes('notavailable')) {
                                      map[matched.key] = 'not_available';
                                    } else if (rawVal.includes('prep') || rawVal === 'prepared' || rawVal === 'true' || rawVal === 'yes') {
                                      map[matched.key] = 'prepared';
                                    }
                                  }
                                });
                                if (Object.keys(map).length > 0) {
                                  setEquipmentState(prev => ({ ...prev, ...map }));
                                }
                              }
                            }
                          } catch (e) {
                            // ignore parse errors
                          }
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

            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <FormLabel className="text-sm font-medium text-gray-700">Available Time Slots</FormLabel>
                {slotsLoading ? (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading
                  </span>
                ) : null}
              </div>
              {slotsError ? (
                <p className="text-xs text-red-600">{slotsError}</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-xs text-gray-500">No available slots for this date. Please choose another date or facility.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableSlots.map((slot, idx) => {
                    const selected = isSlotSelected(slot);
                    return (
                      <button
                        key={`slot-${slot.start.toISOString()}-${idx}`}
                        type="button"
                        onClick={() => handleSlotSelect(slot)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500",
                          selected
                            ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                            : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700"
                        )}
                      >
                        <span>{`${format(slot.start, "hh:mm a")} – ${format(slot.end, "hh:mm a")}`}</span>
                        {slot.source === "fallback" ? (
                          <span className="block text-[10px] text-gray-400">Estimated</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Start Date + Time split */}
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-3">
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full text-left pl-3", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "EEE, MMM d, yyyy") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (!date) return;
                              const current = field.value || new Date();
                              const merged = new Date(date);
                              merged.setHours(current.getHours(), current.getMinutes(), 0, 0);
                              const normalized = normalizeStartTime(merged);
                              field.onChange(normalized);
                              setUserEditedTime(true);
                            }}
                            initialFocus
                            disabled={(date) => isDateBeforeToday(date)}
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>

                    <FormItem>
                      <FormLabel className="invisible">Start Time</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          step={300}
                          value={field.value ? format(field.value, "HH:mm") : ""}
                          onChange={(e) => {
                            const timeValue = e.target.value;
                            if (!timeValue) return;
                            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
                            if (!timeRegex.test(timeValue)) return;
                            const [hours, minutes] = timeValue.split(":").map(Number);
                            const base = field.value ? new Date(field.value) : new Date();
                            base.setHours(hours, minutes, 0, 0);
                            const normalized = normalizeStartTime(base);
                            field.onChange(normalized);
                            setUserEditedTime(true);
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  </div>
                )}
              />

              {/* End Date + Time split */}
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-3">
                    <FormItem>
                      <FormLabel className="text-gray-700">End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full text-left pl-3", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "EEE, MMM d, yyyy") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (!date) return;
                              const start = form.getValues('startTime') || new Date();
                              const normalizedStart = normalizeStartTime(new Date(start));
                              const current = field.value || normalizedStart;
                              const merged = new Date(date);
                              merged.setHours(current.getHours(), current.getMinutes(), 0, 0);
                              const normalizedEnd = normalizeEndTime(normalizedStart, merged);
                              field.onChange(normalizedEnd);
                              setUserEditedTime(true);
                            }}
                            initialFocus
                            disabled={(date) => isDateBeforeToday(date)}
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>

                    <FormItem>
                      <FormLabel className="invisible">End Time</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          step={300}
                          value={field.value ? format(field.value, "HH:mm") : ""}
                          onChange={(e) => {
                            const timeValue = e.target.value;
                            if (!timeValue) return;
                            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
                            if (!timeRegex.test(timeValue)) return;
                            const [hours, minutes] = timeValue.split(":").map(Number);
                            const start = form.getValues('startTime') || new Date();
                            const base = field.value ? new Date(field.value) : new Date();
                            base.setHours(hours, minutes, 0, 0);
                            const normalizedEnd = normalizeEndTime(start, base);
                            field.onChange(normalizedEnd);
                            setUserEditedTime(true);
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  </div>
                )}
              />
            </div>

            {/* Removed top ValidationSummary duplicate */}

            {/* Purpose and Course/Year/Dept fields */}

            {/* Purpose field */}
            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose</FormLabel>
                  <div style={{ display: 'block', width: '100%', maxWidth: '100%' }}>
                    <CustomTextarea
                      value={field.value || ""}
                      onChange={(v) => {
                        // enforce max length at UI level
                        if (v && v.length > PURPOSE_MAX) {
                          field.onChange(v.slice(0, PURPOSE_MAX));
                        } else {
                          field.onChange(v);
                        }
                      }}
                      placeholder="Describe your purpose for booking this facility"
                      maxLength={PURPOSE_MAX}
                      isInvalid={!!(field.value && field.value.length >= PURPOSE_MAX)}
                    />
                  </div>
                  <FormMessage />
                  {field.value && field.value.length >= PURPOSE_MAX ? (
                    <div className="text-xs text-red-600 mt-1">Maximum length reached ({PURPOSE_MAX} characters)</div>
                  ) : null}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="courseYearDept"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course & Year/Department <span className="text-red-500">*</span></FormLabel>
                  <p className="text-xs text-gray-500">Example: BSIT – 3rd Year (Dept. of Computing)</p>
                  <div style={{ display: 'block', width: '100%', maxWidth: '100%' }}>
                    <CustomTextarea
                      value={field.value || ""}
                      onChange={(v) => {
                        if (v && v.length > COURSE_MAX) {
                          field.onChange(v.slice(0, COURSE_MAX));
                        } else {
                          field.onChange(v);
                        }
                      }}
                      placeholder="e.g. BSIT 3rd Year, Faculty of Engineering, etc."
                      maxLength={COURSE_MAX}
                      isInvalid={!!(field.value && field.value.length >= COURSE_MAX)}
                      className="h-9 resize-none"
                      rows={1}
                    />
                  </div>
                  <FormMessage />
                  {field.value && field.value.length >= COURSE_MAX ? (
                    <div className="text-xs text-red-600 mt-1">Maximum length reached ({COURSE_MAX} characters)</div>
                  ) : null}
                </FormItem>
              )}
            />

            {/* Booking Summary - Show different sections based on what's filled */}
            {(selectedFacility || form.watch("startTime") || form.watch("endTime") || form.watch("purpose")) && (
              <div id="booking-summary" className="border-t pt-6">
                <h3 className="font-medium mb-4">Booking Summary</h3>
                <div className="bg-accent/50 p-4 rounded-lg space-y-2">
                  {selectedFacility && (
                    <div className="flex justify-between">
                      <span className="text-sm">Facility:</span>
                      <span className="text-sm font-medium">{selectedFacility.name}</span>
                    </div>
                  )}

                  {form.watch("startTime") && form.watch("endTime") && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm">Date:</span>
                        <span className="text-sm font-medium">
                          {format(form.watch("startTime"), "EEE, MMM d, yyyy")}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm">Time:</span>
                        <span className="text-sm font-medium">
                          {format(form.watch("startTime"), "hh:mm a")} - {format(form.watch("endTime"), "hh:mm a")}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm">Duration:</span>
                        <span className="text-sm font-medium">
                          {calculateDuration(form.watch("startTime"), form.watch("endTime"))}
                        </span>
                      </div>
                    </>
                  )}

                  {form.watch("participants") && (
                    <div className="flex justify-between">
                      <span className="text-sm">Participants:</span>
                      <span className="text-sm font-medium">{form.watch("participants")}</span>
                    </div>
                  )}

                  {form.watch("purpose") && (
                    <div className="flex flex-col space-y-1 pt-2 border-t border-gray-200">
                      <span className="text-sm text-gray-600">Purpose:</span>
                      <div 
                        className="text-left text-sm font-medium text-gray-900 bg-white p-2 rounded border"
                        style={{
                          wordWrap: 'break-word',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          maxWidth: '100%',
                          overflow: 'hidden'
                        }}
                      >
                        {form.watch("purpose")}
                      </div>
                    </div>
                  )}
                  {form.watch("courseYearDept") && (
                    <div className="flex flex-col space-y-1 pt-2 border-t border-gray-200">
                      <span className="text-sm text-gray-600">Course & Year/Department:</span>
                      <div 
                        className="text-left text-sm font-medium text-gray-900 bg-white p-2 rounded border"
                        style={{
                          wordWrap: 'break-word',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          maxWidth: '100%',
                          overflow: 'hidden'
                        }}
                      >
                        {form.watch("courseYearDept")}
                      </div>
                    </div>
                  )}
                  {(Object.keys(equipmentState).filter(k => equipmentState[k]).length > 0 || equipmentOtherText) && (
                    <div className="flex flex-col space-y-1 pt-2 border-t border-gray-200">
                      <span className="text-sm text-gray-600">Equipment:</span>
                      <div
                        className="text-sm font-medium text-gray-900 bg-white p-2 rounded border"
                        style={{
                          wordWrap: 'break-word',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          maxWidth: '100%',
                          overflow: 'hidden'
                        }}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {Object.keys(equipmentState)
                              .filter(k => equipmentState[k] === 'prepared')
                              .map(k => (
                                <div key={`summary-eq-${k}`} className="text-sm">{EQUIPMENT_OPTIONS.find(o => o.key === k)?.label || k}</div>
                              ))}

                            {Object.keys(equipmentState).some(k => equipmentState[k] === 'not_available') && (
                              <div className="text-sm text-red-600">Unavailable: {Object.keys(equipmentState).filter(k => equipmentState[k] === 'not_available').map(k => (EQUIPMENT_OPTIONS.find(o => o.key === k)?.label || k)).join(', ')}</div>
                            )}

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
              <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex gap-3 w-full sm:w-1/2">
                  <div className="flex-1">
                    <Button
                      type="submit"
                      className="w-full h-10 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm"
                      disabled={
                        createBookingMutation.isPending ||
                        isSubmitting
                      }
                    >
                      {createBookingMutation.isPending || isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Submitting...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <Send className="h-4 w-4 mr-2 text-white" />
                            <span>Submit Booking</span>
                          </span>
                        )}
                    </Button>
                  </div>

                  <div className="flex-1">
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="w-full h-10 flex items-center justify-center text-gray-900 bg-white border border-gray-300 rounded-lg text-sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>

                {/* Validation panel moved below to avoid duplicate */}
              </div>
              </DialogFooter>

              {/* Dev-only booking debug panel (visible only in development) */}
              {process.env.NODE_ENV !== 'production' && (() => {
                const currentEmail = String(user?.email || '').toLowerCase();
                const myBookings = (allBookings || []).filter((b: any) => String(b.userEmail || b.user?.email || '').toLowerCase() === currentEmail);
                if (!myBookings || myBookings.length === 0) return null;

                return (
                  <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
                    <div className="font-medium mb-2">Dev: Your bookings</div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {myBookings.map((b: any) => (
                        <div key={b.id} className="flex items-center justify-between gap-3 p-2 bg-white rounded border">
                          <div className="flex-1">
                            <div className="text-xs text-gray-700">ID: {b.id} • Facility: {b.facilityId} • {new Date(b.startTime).toLocaleString()}</div>
                            <div className="text-xs text-gray-600">Status: <span className="font-medium">{String(b.status)}</span></div>
                          </div>
                          <div className="text-xs text-right text-gray-500">Ends: {new Date(b.endTime).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Booking</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to submit this booking?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={async () => {
                      if (!confirmPendingData) return;
                      try {
                        // Fresh server-side check to avoid stale client cache bypass
                        // We intentionally do not use the response directly here; server-side rules are authoritative.
                        await apiRequest('GET', '/api/bookings/all');
                      } catch (e) {
                        console.error('Failed to verify latest bookings before submit', e);
                        toast({ title: 'Network Error', description: 'Could not verify your existing bookings. Please try again.', variant: 'destructive' });
                        setConfirmPendingData(null);
                        setShowConfirmDialog(false);
                        return;
                      }

                      // New: Fresh availability check for the same date to avoid race where another user just scheduled
                      try {
                        const start = new Date(confirmPendingData.startTime);
                        const end = new Date(confirmPendingData.endTime);
                        const dateStr = start.toISOString().slice(0,10);
                        const availResp = await apiRequest('GET', `/api/availability?date=${dateStr}`);
                        const availJson = await availResp.json();
                        const facilityId = parseInt(confirmPendingData.facilityId as any);
                        const facilityEntry = Array.isArray(availJson?.data) ? (availJson.data.find((d: any) => d.facility && d.facility.id === facilityId)) : null;
                        if (facilityEntry) {
                          const overlappingSlots = (facilityEntry.slots || []).filter((slot: any) => {
                            try {
                              if (slot.status !== 'scheduled') return false;
                              const slotStart = new Date(slot.start);
                              const slotEnd = new Date(slot.end);
                              return start < slotEnd && end > slotStart;
                            } catch (e) { return false; }
                          });

                          if (overlappingSlots.length > 0) {
                            toast({ title: 'Time Slot Unavailable', description: 'The selected time overlaps an existing scheduled booking. Please choose a different time or facility.', variant: 'destructive' });
                            setConfirmPendingData(null);
                            setShowConfirmDialog(false);
                            return;
                          }
                        }
                      } catch (e) {
                        console.error('Failed to verify availability before submit', e);
                        toast({ title: 'Network Error', description: 'Could not verify latest availability. Please try again.', variant: 'destructive' });
                        setConfirmPendingData(null);
                        setShowConfirmDialog(false);
                        return;
                      }

                      // Final safety: rely on server validation; do not preemptively block submission here.

                      createBookingMutation.mutate({
                        ...confirmPendingData,
                        reminderOptIn: confirmPendingData.reminderOptIn ?? true,
                        reminderLeadMinutes: confirmPendingData.reminderLeadMinutes ?? REMINDER_LEAD_MINUTES,
                      });
                      setConfirmPendingData(null);
                      setShowConfirmDialog(false);
                    }}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Server-side conflict dialog: show when server reports overlapping bookings for this user */}
              {/* Server conflict dialog removed; conflicts now shown inline below */}

            {/* Inline validation warnings (replaces toasts for form validation) */}
            {(() => {
              const durationWarning = !isDurationValid(form.watch('startTime'), form.watch('endTime'))
                ? [{ title: 'Bookings must be at least 30 minutes long', description: 'Please adjust the times before saving.' }]
                : [];
              
              // If serverConflictPayload exists, filter out any client-side conflict warnings to avoid duplicates
              const clientWarnings = serverConflictPayload 
                ? (formValidationWarnings || []).filter(w => w.title !== 'Conflicting Booking Found' && w.title !== 'Facility Conflict')
                : (formValidationWarnings || []);
              
              const warnings = durationWarning.concat(clientWarnings);
              
              // If serverConflictPayload exists, append a structured conflict warning with action buttons
              if (serverConflictPayload) {
                const conflictBookings = Array.isArray(serverConflictPayload.conflictingBookings) ? serverConflictPayload.conflictingBookings : [];
                const facilityName = serverConflictPayload?.facility?.name || 'Selected facility';
                const baseMsg = serverConflictPayload?.message || 'A conflicting booking exists.';
                let details = '';
                if (conflictBookings.length > 0) {
                  details = conflictBookings.map((c: any) => `${new Date(c.startTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} - ${new Date(c.endTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} (${c.status})`).join('; ');
                }
                warnings.push({
                  title: 'Conflicting Booking Found',
                  description: `${baseMsg}${details ? ' Conflicts: ' + details : ''}`,
                });
              }
              if (warnings.length === 0) return null;
              return (
                <div id="booking-form-errors" className="mt-3 text-sm rounded-b-lg px-4 py-3 bg-white border-t border-gray-200">
                  {warnings.map((w, idx) => (
                    <div key={idx} className="mb-2 flex items-start gap-3">
                      <div className="mt-0.5 text-yellow-600 text-xl">⚠️</div>
                      <div>
                        <div className="font-semibold text-red-700 text-sm">{w.title}</div>
                        <div className="text-red-600 text-sm mt-1">{w.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </form>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}

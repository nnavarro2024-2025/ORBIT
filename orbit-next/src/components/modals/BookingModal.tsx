import { CustomTextarea } from "@/components/ui/custom-textarea";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Calendar as CalendarIcon, Plus, Minus, Send, X, Loader2, TriangleAlert } from "lucide-react"; // Added Plus, Minus, Send, X, Loader2, TriangleAlert icons
import type { Facility } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DialogDescription } from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

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
  // Filter out restricted facilities for non-faculty/admin users
  const visibleFacilities = useMemo(() => {
    return allFacilities.filter(facility => {
      const name = String(facility.name || '').toLowerCase();
      const restricted = /board room|boardroom|lounge/.test(name);
      const allowedByRole = (user?.role === 'faculty' || user?.role === 'admin');
      return facility.isActive && !(restricted && !allowedByRole);
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

  // Library working hours validation functions
  const isWithinLibraryHours = (date: Date): boolean => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    const libraryOpenTime = 7 * 60 + 30; // 7:30 AM
    const libraryCloseTime = 19 * 60; // 7:00 PM
    return timeInMinutes >= libraryOpenTime && timeInMinutes <= libraryCloseTime;
  };

  const formatLibraryHours = (): string => {
    return "7:30 AM - 7:00 PM";
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
          const minMs = 30 * 60 * 1000; // 30 minutes
          if (diff <= 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End time must be after start time', path: ['endTime'] });
          } else if (diff < minMs) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Bookings must be at least 30 minutes long', path: ['endTime'] });
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

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    mode: 'onChange',
    defaultValues: {
      facilityId: "",
      startTime: initialStartTime ?? new Date(Date.now() + 60 * 60 * 1000), // Default: initialStartTime or now + 1 hour
      endTime: initialEndTime ?? new Date(Date.now() + 90 * 60 * 1000), // Default: initialEndTime or start + 30 minutes
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
      const currentStart = form.getValues('startTime');
      const currentStartMs = currentStart instanceof Date ? currentStart.getTime() : undefined;
      const nextStartMs = initialStartTime.getTime();
      if (currentStartMs !== nextStartMs) {
        form.setValue('startTime', initialStartTime);
      }
    }

    if (initialEndTime) {
      const currentEnd = form.getValues('endTime');
      const currentEndMs = currentEnd instanceof Date ? currentEnd.getTime() : undefined;
      const nextEndMs = initialEndTime.getTime();
      if (currentEndMs !== nextEndMs) {
        form.setValue('endTime', initialEndTime);
      }
    }
  }, [isOpen, initialStartTime, initialEndTime, form]);

  const [formValidationWarnings, setFormValidationWarnings] = useState<Array<{title: string; description: string}>>([]);
  // Track whether the user manually edited the date/time so we don't overwrite their choices
  const [userEditedTime, setUserEditedTime] = useState(false);
  type AvailableSlot = { start: Date; end: Date; source: "api" | "fallback" };
  const slotCacheRef = useRef<Map<string, AvailableSlot[]>>(new Map());
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const startTimeValue = form.watch("startTime");
  const facilityIdValue = form.watch("facilityId");
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

      for (let cursor = new Date(startWindow); cursor.getTime() + SLOT_MS <= endWindow.getTime(); cursor = new Date(cursor.getTime() + SLOT_MS)) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(cursor.getTime() + SLOT_MS);
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
            .map((slot: any) => ({ start: new Date(slot.start), end: new Date(slot.end), source: "api" as const }));
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

  useEffect(() => {
    if (!isOpen) return;
    if (userEditedTime) return;
    if (availableSlots.length === 0) return;

    const firstSlot = availableSlots[0];
    const currentStart = form.getValues('startTime');
    const currentEnd = form.getValues('endTime');

    const startMatches = currentStart && Math.abs(currentStart.getTime() - firstSlot.start.getTime()) < 60 * 1000;
    const endMatches = currentEnd && Math.abs(currentEnd.getTime() - firstSlot.end.getTime()) < 60 * 1000;

    if (!startMatches) {
      form.setValue('startTime', firstSlot.start);
    }
    if (!endMatches) {
      form.setValue('endTime', firstSlot.end);
    }
  }, [availableSlots, userEditedTime, isOpen, form]);

  const handleSlotSelect = (slot: AvailableSlot) => {
    form.setValue('startTime', slot.start, { shouldDirty: true });
    form.setValue('endTime', slot.end, { shouldDirty: true });
    setUserEditedTime(true);
  };

  const isSlotSelected = (slot: AvailableSlot) => {
    if (!startTimeValue) return false;
    return Math.abs(startTimeValue.getTime() - slot.start.getTime()) < 60 * 1000;
  };

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
          const msg = error.payload.message || 'A conflicting booking exists. Please cancel it first or choose a different time.';
          setFormValidationWarnings([{ title: code === 'UserHasActiveBooking' ? 'Existing Booking Detected' : 'Conflicting Booking Detected', description: msg }]);
          setServerConflictPayload(error.payload);
          setShowServerConflictDialog(true);
          return;
        }

        // Also handle facility-level conflicts returned from the storage layer (ConflictError -> 409 payload)
        if (error.payload && (error.payload.facility || error.payload.conflictingBookings)) {
          const msg = error.payload.message || 'This time slot for the selected facility is already booked. Please choose a different time.';
          setFormValidationWarnings([{ title: 'Time Slot Unavailable', description: msg }]);
          // Keep the payload so the dialog can show more details if available
          setServerConflictPayload(error.payload);
          setShowServerConflictDialog(true);
          return;
        }
      }
      
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

  // Server conflict dialog
  const [showServerConflictDialog, setShowServerConflictDialog] = useState(false);
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
      setShowServerConflictDialog(false);
      setServerConflictPayload(null);
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      toast({ title: 'Error', description: err?.message || 'Could not force-cancel conflicts.', variant: 'destructive' });
    }
  };

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

    // Collect all validation errors
    const validationErrors: Array<{title: string, description: string}> = [];

    // Validate start time is not in the past
    const currentTime = new Date();
    if (data.startTime.getTime() < currentTime.getTime()) {
      validationErrors.push({
        title: "Invalid Start Time",
        description: "Start time cannot be in the past. Please select a future time.",
      });
    }

    // NOTE: Minimum lead-time validation removed from client to avoid duplicate
    // enforcement and improve UX; server-side validation is authoritative and
    // will return structured errors if any lead-time policy is required.

    // Validate facility exists
    const facility = facilities.find(f => f.id === parseInt(data.facilityId));
    if (!facility) {
      validationErrors.push({
        title: "Error",
        description: "Selected facility not found.",
      });
      } else {
      // NOTE: Client-side 'Facility Booking Limit' validation removed so server-side
      // can handle canonical conflict resolution. Users will still see server errors
      // if a conflict exists; we avoid blocking submission here to allow auto-scheduling flows.
      // Use actual facility capacity from database
      const maxCapacity = facility.capacity || 8;

      if (data.participants > maxCapacity) {
        validationErrors.push({
          title: "Capacity Exceeded",
          description: `The selected room has a maximum capacity of ${maxCapacity} people. Please reduce the number of participants.`,
        });
      }
    }

    // Validate end time is after start time
    if (data.endTime <= data.startTime) {
      validationErrors.push({
        title: "Invalid Time Selection",
        description: "End time must be after start time.",
      });
    }

    // Validate same calendar day (no multi-day bookings)
    const sDate = data.startTime;
    const eDate = data.endTime;
    if (sDate.getFullYear() !== eDate.getFullYear() || sDate.getMonth() !== eDate.getMonth() || sDate.getDate() !== eDate.getDate()) {
      validationErrors.push({
        title: "Single-Day Booking Required",
        description: "Start and end must be on the same calendar day. Please split multi-day events into separate bookings.",
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
  title: "School Hours",
  description: `Your ${timeIssues.join(" and ")} ${timeIssues.length > 1 ? "are" : "is"} outside school operating hours (${formatLibraryHours()}). Room access is only available during these hours.`,
      });
    }

    const maxDurationMs = 2 * 60 * 60 * 1000;
    if (data.startTime && data.endTime) {
      const durationMs = data.endTime.getTime() - data.startTime.getTime();
      if (durationMs > maxDurationMs) {
        validationErrors.push({
          title: "Maximum Duration Exceeded",
          description: "Bookings exceeding the maximum allowed duration are not permitted.",
        });
      }
    }

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

  const isDurationValid = (start: Date | undefined, end: Date | undefined) => {
    if (!start || !end) return false;
    const diff = end.getTime() - start.getTime();
    return diff >= 30 * 60 * 1000; // at least 30 minutes
  };

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
  if (initialStartTime && initialEndTime) {
          const providedStartValid = isWithinLibraryHours(initialStartTime);
          const providedEndValid = isWithinLibraryHours(initialEndTime);

          const blockingStatuses = new Set(['approved', 'scheduled', 'pending']);
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

        const blockingStatuses = new Set(['approved', 'scheduled', 'pending']);
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
                              const newDate = new Date(date);
                              // preserve time from current selection
                              newDate.setHours(current.getHours(), current.getMinutes(), 0, 0);
                              field.onChange(newDate);
                              // mark that the user edited the time/date manually
                              setUserEditedTime(true);
                            }}
                            initialFocus
                            disabled={(date) => date < new Date()}
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
                            const newDate = field.value ? new Date(field.value) : new Date();
                            newDate.setHours(hours, minutes, 0, 0);
                            field.onChange(newDate);
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
                              const current = field.value || new Date();
                              const newDate = new Date(date);
                              newDate.setHours(current.getHours(), current.getMinutes(), 0, 0);
              field.onChange(newDate);
              setUserEditedTime(true);
                            }}
                            initialFocus
                            disabled={(date) => date < new Date()}
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
                            const newDate = field.value ? new Date(field.value) : new Date();
                            newDate.setHours(hours, minutes, 0, 0);
                            field.onChange(newDate);
                            setUserEditedTime(true);
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  </div>
                )}
              />
            </div>

            {/* Time Conflict Warning */}
            {(() => {
              const conflicts = checkTimeConflict();
              if (!conflicts) return null;
              
              return (
                <div id="booking-form-errors" className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <TriangleAlert className="h-5 w-5" />
                    <span className="font-semibold">Please review the following issues</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 mb-2">
                        Time Conflict Detected
                      </p>
                      <p className="text-sm text-red-700 mb-3">
                        Your selected time overlaps with {conflicts.length} existing booking{conflicts.length > 1 ? 's' : ''}:
                      </p>
                      <div className="space-y-2">
                        {conflicts.slice(0, Math.min(PREVIEW_LIMIT, conflicts.length)).map((booking: any, index: number) => (
                          <div key={index} className="bg-red-100 rounded p-2">
                            <p className="text-xs text-red-800">
                              {new Date(booking.startTime).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })} • {new Date(booking.startTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })} - {new Date(booking.endTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </p>
                          </div>
                        ))}
                        {conflicts.length > PREVIEW_LIMIT && (
                          <p className="text-xs text-red-600">
                            +{conflicts.length - PREVIEW_LIMIT} more conflict{conflicts.length - PREVIEW_LIMIT > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-red-700 mt-3">
                        Please choose a different time to avoid conflicts.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

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

                {/* Right-aligned helper: shows default message or an error indicator when issues exist */}
                <div className="w-full sm:w-1/2 flex justify-start sm:justify-end">
                  <div className="w-full max-w-md text-left sm:text-right text-sm">
                    {(() => {
                      const durationWarning = !isDurationValid(form.watch('startTime'), form.watch('endTime'))
                        ? [{ title: 'Bookings must be at least 30 minutes long', description: 'Please adjust the times before saving.' }]
                        : [];
                      const warnings = durationWarning.concat(formValidationWarnings || []);
                      const serverError = createBookingMutation?.error ? String((createBookingMutation.error as any)?.message || createBookingMutation.error) : null;

                      if (warnings.length || serverError) {
                        return (
                          <div className="inline-flex items-start gap-2 text-left sm:text-right">
                            <div className="text-red-600 mt-0.5">⚠️</div>
                            <div className="text-left sm:text-right">
                              <div className="font-medium text-red-700 text-xs sm:text-sm">Errors detected</div>
                              <div className="text-red-600 text-xs">See details below</div>
                            </div>
                          </div>
                        );
                      }

                      return <div className="text-gray-500 text-xs sm:text-sm break-words">Validation errors will appear below after submission.</div>;
                    })()}
                  </div>
                </div>
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
              <AlertDialog open={showServerConflictDialog} onOpenChange={setShowServerConflictDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Conflicting Booking Found</AlertDialogTitle>
                    <AlertDialogDescription>
                      The server reports you already have a pending or approved booking that overlaps this time.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="p-3">
                    {serverConflictPayload?.conflictingBookings && serverConflictPayload.conflictingBookings.length > 0 ? (
                      <div className="space-y-2 text-sm">
                        <div className="font-medium">Conflicting bookings:</div>
                        {serverConflictPayload.conflictingBookings.map((c: any) => (
                          <div key={c.id} className="text-xs">
                            Facility {c.facilityId} — {new Date(c.startTime).toLocaleString()} to {new Date(c.endTime).toLocaleTimeString()}
                            {' '}• Status: {c.status}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm">A conflicting booking exists. You may cancel it and proceed.</div>
                    )}
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => { setShowServerConflictDialog(false); setServerConflictPayload(null); }}>Close</AlertDialogCancel>
                    <AlertDialogAction onClick={handleForceCancelAndProceed}>Cancel existing bookings and proceed</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

            {/* Inline validation warnings (replaces toasts for form validation) */}
            {(() => {
              const durationWarning = !isDurationValid(form.watch('startTime'), form.watch('endTime'))
            ? [{ title: 'Bookings must be at least 30 minutes long', description: 'Please adjust the times before saving.' }]
            : [];
          const warnings = durationWarning.concat(formValidationWarnings || []);
              if (warnings.length === 0) return null;

              return (
                <div id="booking-form-errors" className="mt-3 text-sm rounded-b-lg px-4 py-3 bg-white border-t border-gray-200">
                  {warnings.map((w, idx) => (
                    <div key={idx} className="mb-2 flex items-start gap-3">
                      {/* larger yellow warning icon to match design */}
                      <div className="mt-0.5 text-yellow-600 text-xl">⚠️</div>
                      <div>
                        {/* Bold, red heading like the screenshot */}
                        <div className="font-semibold text-red-700 text-sm">{w.title}</div>
                        {/* Supporting text in slightly lighter red and smaller size */}
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

import { CustomTextarea } from "@/components/ui/custom-textarea";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Send, Calendar as CalendarIcon, Plus, Minus } from "lucide-react"; // Added Plus, Minus icons
import type { Facility } from "../../../../shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Small helper: return a short description for known facility names
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

// Library working hours validation functions - for room USAGE, not booking submission
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

// Dynamic booking schema factory
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
    participants: z.number().min(1, "Number of participants is required"),
  })

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilities: Facility[];
  selectedFacilityId?: number | null;
}

export default function BookingModal({
  isOpen,
  onClose,
  facilities,
  selectedFacilityId,
}: BookingModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmissionTime, setLastSubmissionTime] = useState(0);
  const SUBMISSION_COOLDOWN = 2000; // 2 seconds cooldown between submissions
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

  // Get all current bookings to show facility availability
  const { data: allBookings = [] } = useQuery<any[]>({
    queryKey: ["/api/bookings/all"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/bookings/all");
      return response.json();
    },
    enabled: isOpen, // Only fetch when modal is open
  });

  const predefinedFacilities = [
    { id: 1, name: "Collaraborative Learning Room 1", isActive: true, capacity: 8 },
    { id: 2, name: "Collaraborative Learning Room 2", isActive: true, capacity: 8 },
    { id: 3, name: "Board Room", isActive: true, capacity: 12 },
  ];

  const allFacilities = facilities.length > 0 ? facilities : predefinedFacilities;
  const fallbackFacilities = allFacilities.filter(facility => facility.isActive);

  const getFacilityMaxCapacity = (facility?: Facility | { id: number; name: string; isActive: boolean; capacity: number; } | null) => {
    if (!facility) return 8; // Default fallback for unknown facilities
    // Problem 3 Fix: Better null safety - ensure capacity is a valid number
    const capacity = facility.capacity;
    return (typeof capacity === 'number' && capacity > 0) ? capacity : 8;
  };

  const getFacilityCurrentStatus = (facilityId: number) => {
    const now = new Date();
    
    const facilityBookings = allBookings.filter((booking: any) => 
      booking.facilityId === facilityId && 
      (booking.status === "approved" || booking.status === "pending") &&
      new Date(booking.endTime) > now
    ).sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    if (facilityBookings.length === 0) return null;

    // Check for currently active booking
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

    // Check for upcoming bookings
    const upcomingBookings = facilityBookings.filter((booking: any) => 
      booking.status === "approved" && new Date(booking.startTime) > now
    );

    if (upcomingBookings.length > 0) {
      return {
        type: "upcoming",
        message: `${upcomingBookings.length} upcoming booking${upcomingBookings.length > 1 ? 's' : ''}`,
        bookings: upcomingBookings
      };
    }

    return null;
  };

  const getUserFacilityBookings = (facilityId: number) => {
    if (!user?.email) return [];
    
    return allBookings.filter((booking: any) =>
      booking.facilityId === facilityId &&
      booking.userEmail === user.email &&
      (booking.status === "approved" || booking.status === "pending") &&
      new Date(booking.endTime) > new Date() // Only future/current bookings
    );
  };

  const bookingSchema = createBookingSchema();
  type BookingFormData = z.infer<typeof bookingSchema>;

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    mode: 'onChange',
    defaultValues: {
      facilityId: "",
      startTime: new Date(new Date().getTime() + 5 * 60 * 1000), // Default to current date and time + 5 minutes
      endTime: new Date(Date.now() + 35 * 60 * 1000), // 30 minutes after start time
      purpose: "",
      participants: 1,
    },
  });

  // Auto-select facility when modal opens with a specific facility ID
  useEffect(() => {
    if (isOpen && selectedFacilityId) {
      const facility = facilities.find(f => f.id === selectedFacilityId);
      if (facility && facility.isActive) {
        setSelectedFacility(facility);
        // Also update the form field
        form.setValue('facilityId', facility.id.toString());
      }
    } else if (isOpen && !selectedFacilityId) {
      // Reset selection when modal opens without a specific facility
      setSelectedFacility(null);
      // Only auto-select first facility if no specific facility was requested
      if (fallbackFacilities.length > 0 && !form.watch("facilityId")) {
        const firstId = fallbackFacilities[0].id.toString();
        form.setValue("facilityId", firstId);
        handleFacilityChange(firstId);
      }
    }
  }, [isOpen, selectedFacilityId, facilities, form, fallbackFacilities]);

  const handleFacilityChange = (facilityId: string) => {
    const facility = facilities.find((f) => f.id === parseInt(facilityId));
    setSelectedFacility(facility || null);
    // Cap participants to selected facility's max
    const currentParticipants = form.getValues("participants");
    const maxCap = getFacilityMaxCapacity(facility || null);
    if (currentParticipants > maxCap) {
      form.setValue("participants", maxCap);
    }
  };

  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      setIsSubmitting(true);
      
      // Check if selected facility is available
      const selectedFacility = facilities.find(f => f.id === parseInt(data.facilityId));
      if (!selectedFacility || !selectedFacility.isActive) {
        throw new Error("Selected facility is currently unavailable for booking. Please choose another facility.");
      }

      const bookingData = {
        ...data,
        facilityId: parseInt(data.facilityId),
        startTime: data.startTime.toISOString(),
        endTime: data.endTime.toISOString(),
      };
      const response = await apiRequest("POST", "/api/bookings", bookingData);
      return response.json();
    },
    onSuccess: () => {
      setIsSubmitting(false);
      setLastSubmissionTime(Date.now());
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Submitted",
        description: "Your booking request has been submitted successfully.",
        variant: "default",
      });
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      console.error("Booking error:", error);
      
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
        toast({
          title: "Time Slot Unavailable",
          description: "This time slot is already booked. Please choose a different time or facility.",
          variant: "destructive",
        });
      }
      // Handle capacity validation error
      else if (error.message && error.message.includes("exceeds facility capacity")) {
        toast({
          title: "Participant Limit Exceeded",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "An error occurred while creating your booking.",
          variant: "destructive",
        });
      }
    },
  });

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

    // Validate facility exists
    const facility = facilities.find(f => f.id === parseInt(data.facilityId));
    if (!facility) {
      validationErrors.push({
        title: "Error",
        description: "Selected facility not found.",
      });
    } else {
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

    // Validate library hours for both start and end time
    const startTimeValid = isWithinLibraryHours(data.startTime);
    const endTimeValid = isWithinLibraryHours(data.endTime);
    
    if (!startTimeValid || !endTimeValid) {
      let timeIssues = [];
      if (!startTimeValid) timeIssues.push("start time");
      if (!endTimeValid) timeIssues.push("end time");
      
      validationErrors.push({
        title: "Library Hours",
        description: `Your ${timeIssues.join(" and ")} ${timeIssues.length > 1 ? "are" : "is"} outside library operating hours (${formatLibraryHours()}). Room access is only available during these hours.`,
      });
    }

    // Show all validation errors as separate toasts
    if (validationErrors.length > 0) {
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

  // Store pending data and open confirmation dialog
  setConfirmPendingData(data);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">New Facility Booking</DialogTitle>
          <DialogDescription>
            Create a new booking by selecting a facility, date, and time. Please follow library hours and room capacity rules.
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
                            <SelectItem key={f.id} value={f.id.toString()} description={getFacilityDescriptionByName(f.name)}>
                              {f.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {/* Show current facility status */}
                {selectedFacility && (() => {
                  const status = getFacilityCurrentStatus(selectedFacility.id);
                  if (!status) return null;
                  
                  return (
                    <div className={`p-3 rounded-lg border ${
                      status.type === 'active' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${
                          status.type === 'active' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            status.type === 'active' ? 'text-red-800' : 'text-yellow-800'
                          }`}>
                            {status.message}
                          </p>
                          {status.type === 'upcoming' && (status as any).bookings && (
                            <div className="mt-2 space-y-1">
                              {(status as any).bookings.slice(0, 3).map((booking: any, index: number) => (
                                <p key={index} className="text-xs text-yellow-700">
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
                              ))}
                              {(status as any).bookings.length > 3 && (
                                <p className="text-xs text-yellow-600">
                                  +{(status as any).bookings.length - 3} more booking{(status as any).bookings.length - 3 > 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Show warning if user already has a booking for this facility */}
                {selectedFacility && (() => {
                  const userBookings = getUserFacilityBookings(selectedFacility.id);
                  if (userBookings.length === 0) return null;

                  return (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-orange-800 mb-2">
                            ⚠️ Facility Booking Limit
                          </p>
                          <p className="text-sm text-orange-700 mb-2">
                            You already have {userBookings.length} active booking{userBookings.length > 1 ? 's' : ''} for this facility. 
                            You cannot create additional requests for the same facility.
                          </p>
                          <div className="space-y-1">
                            {userBookings.slice(0, 2).map((booking: any, index: number) => (
                              <div key={index} className="bg-orange-100 rounded p-2">
                                <p className="text-xs text-orange-800">
                                  {booking.status === "approved" ? "✅ Approved" : "⏳ Pending"} • {new Date(booking.startTime).toLocaleDateString('en-US', {
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
                            {userBookings.length > 2 && (
                              <p className="text-xs text-orange-600">
                                +{userBookings.length - 2} more booking{userBookings.length - 2 > 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                          <p className="text-sm text-orange-700 mt-2">
                            Please cancel your existing booking first or choose a different facility.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              <FormField
                control={form.control}
                name="participants"
                render={({ field }) => {
                  // Problem 1 & 2 Fix: Calculate facility and maxCap once to avoid repetition
                  const facilityId = form.watch("facilityId");
                  // Problem 5 Fix: Only lookup facility if facilityId exists and is valid
                  const currentFacility = facilityId ? allFacilities.find(f => f.id === parseInt(facilityId)) : null;
                  // Problem 4 Fix: Ensure currentFacility is properly handled when undefined
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
                      <FormLabel>End Date</FormLabel>
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
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
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
                        {conflicts.slice(0, 2).map((booking: any, index: number) => (
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
                        {conflicts.length > 2 && (
                          <p className="text-xs text-red-600">
                            +{conflicts.length - 2} more conflict{conflicts.length - 2 > 1 ? 's' : ''}
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

            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose</FormLabel>
                  <div style={{ display: 'block', width: '100%', maxWidth: '100%' }}>
                    <CustomTextarea
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Describe your purpose for booking this facility"
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Booking Summary - Show different sections based on what's filled */}
            {(selectedFacility || form.watch("startTime") || form.watch("endTime") || form.watch("purpose")) && (
              <div className="border-t pt-6">
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
                        {form.watch("purpose")}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-4 pt-6">
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={
                  createBookingMutation.isPending || 
                  isSubmitting || 
                  (selectedFacility ? getUserFacilityBookings(selectedFacility.id).length > 0 : false)
                }
              >
                <Send className="h-4 w-4 mr-2" />
                {createBookingMutation.isPending || isSubmitting ? "Submitting..." : 
                 (selectedFacility && getUserFacilityBookings(selectedFacility.id).length > 0) ? "Cannot Book Same Facility" :
                 "Submit Booking"}
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>

              <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Booking</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to submit this booking request?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => {
                      if (!confirmPendingData) return;
                      createBookingMutation.mutate(confirmPendingData);
                      setConfirmPendingData(null);
                      setShowConfirmDialog(false);
                    }}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </form>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Send, Calendar as CalendarIcon, Plus, Minus } from "lucide-react"; // Added Plus, Minus icons
import type { Facility } from "../../../../shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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


const bookingSchema = z
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
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilities: Facility[];
  selectedFacilityId?: number | null;
}

export default function BookingModal({
  isOpen,
  onClose,
  facilities = [],
  selectedFacilityId = null,
}: BookingModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

  const predefinedFacilities = [
    { id: 1, name: "Study Room A", isActive: true },
    { id: 2, name: "Study Room B", isActive: true },
    { id: 3, name: "Nap Pod C", isActive: true },
  ];

  const allFacilities = facilities.length > 0 ? facilities : predefinedFacilities;
  const fallbackFacilities = allFacilities.filter(facility => facility.isActive);

  const getFacilityMaxCapacity = (facility?: Facility | null) => {
    if (!facility) return 20;
    const raw = (facility.name || '').toLowerCase();
    const normalized = raw.replace(/[^a-z0-9]/g, ''); // remove spaces/punctuations
    const containsAll = (parts: string[]) => parts.every(p => normalized.includes(p));
    const isCLR1 = containsAll(['collaborative','learning','room','1']) || containsAll(['collaborative','learning','1']) || normalized.includes('clr1');
    const isCLR2 = containsAll(['collaborative','learning','room','2']) || containsAll(['collaborative','learning','2']) || normalized.includes('clr2');
    if (isCLR1 || isCLR2) return 8;
    if (normalized.includes('boardroom') || containsAll(['board','room'])) return 12;
    return facility.capacity || 20;
  };

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
      console.error("Booking error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BookingFormData) => {
    const now = new Date();
    if (data.startTime.getTime() < now.getTime()) {
      toast({
        title: "Invalid Start Time",
        description: "Start time cannot be in the past. Please select a future time.",
        variant: "destructive",
      });
      return;
    }

    const facility = facilities.find(f => f.id === parseInt(data.facilityId));
    if (!facility) {
      toast({
        title: "Error",
        description: "Selected facility not found.",
        variant: "destructive",
      });
      return;
    }

    let maxCapacity = facility.capacity;
    const lowerCaseName = facility.name.toLowerCase();

    const isCLR1 = lowerCaseName.includes('collaborative learning room 1') || lowerCaseName.includes('collaborative learning 1');
    const isCLR2 = lowerCaseName.includes('collaborative learning room 2') || lowerCaseName.includes('collaborative learning 2');

    if (isCLR1 || isCLR2) {
      maxCapacity = 8;
    } else if (lowerCaseName.includes('board room') || lowerCaseName.includes('boardroom')) {
      maxCapacity = 12;
    }

    if (data.participants > maxCapacity) {
      toast({
        title: "Capacity Exceeded",
        description: `The selected room has a maximum capacity of ${maxCapacity} people. Please reduce the number of participants.`, 
        variant: "destructive",
      });
      return;
    }

    createBookingMutation.mutate(data);
  };

  const formatDateTimeDisplay = (date: Date | undefined) => {
    return date ? format(date, "PPP hh:mm a") : "Pick a date and time";
  };

  const calculateDuration = (start: Date | undefined, end: Date | undefined) => {
    if (!start || !end) return "";
    const diff = end.getTime() - start.getTime();
    if (diff <= 0) return "";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">New Facility Booking</DialogTitle>
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
                            <SelectItem key={f.id} value={f.id.toString()}>
                              {f.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              <FormField
                control={form.control}
                name="participants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Participants</FormLabel>
                    <FormControl>
                      <NumberInputWithControls
                        value={field.value}
                        onChange={(val) => {
                          const maxCap = getFacilityMaxCapacity(selectedFacility);
                          const numVal = typeof val === 'string' ? parseInt(val, 10) : val;
                          field.onChange(Math.min(numVal, maxCap));
                        }}
                        min={1}
                        max={getFacilityMaxCapacity(selectedFacility)}
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground mt-1">
                      Max capacity: {getFacilityMaxCapacity(selectedFacility)}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Time</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP hh:mm a")
                            ) : (
                              <span>Pick a date and time</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                        <div className="p-3 border-t border-border">
                          <Input
                            type="time"
                            step={300}
                            value={field.value ? format(field.value, "HH:mm") : ""}
                            onChange={(e) => {
                              const [hours, minutes] = e.target.value.split(":").map(Number);
                              const newDate = field.value || new Date();
                              newDate.setHours(hours, minutes);
                              field.onChange(newDate);
                            }}
                            className="w-full"
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Time</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP hh:mm a")
                            ) : (
                              <span>Pick a date and time</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                        <div className="p-3 border-t border-border">
                          <Input
                            type="time"
                            step={300}
                            value={field.value ? format(field.value, "HH:mm") : ""}
                            onChange={(e) => {
                              const [hours, minutes] = e.target.value.split(":").map(Number);
                              const newDate = field.value || new Date();
                              newDate.setHours(hours, minutes);
                              field.onChange(newDate);
                            }}
                            className="w-full"
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe your purpose" className="h-24" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedFacility && form.watch("startTime") && form.watch("endTime") && (
              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Booking Summary</h3>
                <div className="bg-accent/50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Facility:</span>
                    <span className="text-sm font-medium">{selectedFacility.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Date & Time:</span>
                    <span className="text-sm font-medium">
                      {formatDateTimeDisplay(form.watch("startTime"))} - {format(form.watch("endTime"), "HH:mm")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Duration:</span>
                    <span className="text-sm font-medium">
                      {calculateDuration(form.watch("startTime"), form.watch("endTime"))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Participants:</span>
                    <span className="text-sm font-medium">{form.watch("participants")}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-4 pt-6">
              <Button type="submit" className="flex-1" disabled={createBookingMutation.isPending}>
                <Send className="h-4 w-4 mr-2" />
                {createBookingMutation.isPending ? "Submitting..." : "Submit Booking"}
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}

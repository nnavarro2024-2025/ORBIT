import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { X, Send } from "lucide-react";
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

// Add fallback facilities for debugging or testing
const predefinedFacilities = [
  { id: 1, name: "Study Room A" },
  { id: 2, name: "Computer Station B" },
  { id: 3, name: "Nap Pod C" },
];

const bookingSchema = z
  .object({
    facilityId: z.string().min(1, "Please select a facility"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    purpose: z.string().min(1, "Purpose is required"),
    participants: z.coerce.number().min(1, "Number of participants is required"),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: "End time must be after start time",
    path: ["endTime"],
  });

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilities: any[];
}

export default function BookingModal({
  isOpen,
  onClose,
  facilities = [],
}: BookingModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFacility, setSelectedFacility] = useState<any>(null);

  const fallbackFacilities = facilities.length > 0 ? facilities : predefinedFacilities;

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      facilityId: "",
      startTime: "",
      endTime: "",
      purpose: "",
      participants: 1,
    },
  });

  // Automatically select first facility when modal opens
  useEffect(() => {
    if (isOpen && fallbackFacilities.length > 0 && !form.watch("facilityId")) {
      const firstId = fallbackFacilities[0].id.toString();
      form.setValue("facilityId", firstId);
      handleFacilityChange(firstId);
    }
  }, [isOpen, fallbackFacilities]);

  const handleFacilityChange = (facilityId: string) => {
    const facility = fallbackFacilities.find((f) => f.id === parseInt(facilityId));
    setSelectedFacility(facility);
    console.log("Selected facility:", facility);
  };

  const createBookingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bookingSchema>) => {
      const bookingData = {
        ...data,
        facilityId: parseInt(data.facilityId),
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
      };
      console.log("Sending booking data:", bookingData);
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

  const onSubmit = (data: z.infer<typeof bookingSchema>) => {
    console.log("Form submitted:", data);
    createBookingMutation.mutate(data);
  };

  const formatDateTime = (start: string, end: string) => {
    if (!start || !end) return "";
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString()} • ${s.toLocaleTimeString()} - ${e.toLocaleTimeString()}`;
  };

  const calculateDuration = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
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
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
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
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
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
                      {formatDateTime(form.watch("startTime"), form.watch("endTime"))}
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
        </Form>
      </DialogContent>
    </Dialog>
  );
}

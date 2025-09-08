import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  onSave: (updatedBooking: any) => void;
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

  useEffect(() => {
    if (booking) {
      setPurpose(booking.purpose || "");
      setFacilityId(booking.facilityId?.toString() || "");

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

  const handleSave = () => {
    if (!purpose || !facilityId || !startTime || !endTime) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    const now = new Date(); // Capture current time at the start of submission
    if (startTime.getTime() < now.getTime()) { // Compare timestamps
      toast({
        title: "Invalid Start Time",
        description: "Start time cannot be in the past. Please select a future time.",
        variant: "destructive",
      });
      return;
    }

    const facility = facilities.find(f => f.id === parseInt(facilityId));
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

    if (participants > maxCapacity) {
      toast({
        title: "Capacity Exceeded",
        description: `The selected room has a maximum capacity of ${maxCapacity} people. Please reduce the number of participants.`, 
        variant: "destructive",
      });
      return;
    }

    onSave({
      ...booking,
      purpose,
      facilityId: parseInt(facilityId, 10),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      participants, // Include participants in saved data
    });
    onClose();
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="purpose" className="text-right">
              Purpose
            </Label>
            <Input
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="col-span-3"
            />
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
                  <SelectItem key={facility.id} value={facility.id.toString()}>
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
              <NumberInputWithControls
                value={participants}
                onChange={setParticipants}
                min={1}
                max={20} // Assuming a reasonable max for participants
              />
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
                      const [hours, minutes] = e.target.value.split(":").map(Number);
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
                      const [hours, minutes] = e.target.value.split(":").map(Number);
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
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface UnavailableReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  facility: any | null;
  onConfirm: (reason?: string, startDate?: string, endDate?: string) => void;
}

export default function UnavailableReasonModal({ isOpen, onClose, facility, onConfirm }: UnavailableReasonModalProps) {
  const [reason, setReason] = useState<string>("");
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (facility) {
      const defaultMsg = facility.name
        ? `${facility.name} is temporarily unavailable due to maintenance. We apologize for the inconvenience.`
        : 'This room is temporarily unavailable. Please contact staff for more information.';
      setReason(defaultMsg);
    } else {
      setReason("");
    }
    // Reset selected dates when modal opens
    setSelectedDates(new Set());
    setCurrentMonth(new Date());
  }, [facility, isOpen]);

  // Helper to check if a date is in the past or today
  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate <= today;
  };

  // Format date as YYYY-MM-DD
  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Toggle date selection
  const toggleDate = (date: Date) => {
    if (isDateDisabled(date)) return;
    
    const dateKey = formatDateKey(date);
    const newSelected = new Set(selectedDates);
    
    if (newSelected.has(dateKey)) {
      newSelected.delete(dateKey);
    } else {
      newSelected.add(dateKey);
    }
    
    setSelectedDates(newSelected);
  };

  // Navigate months
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  // Get calendar days for current month
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const handleConfirm = () => {
    const trimmed = reason?.trim();
    // Get start and end dates from selected dates
    const dates = Array.from(selectedDates).sort();
    const startDate = dates.length > 0 ? dates[0] : undefined;
    const endDate = dates.length > 0 ? dates[dates.length - 1] : undefined;
    
    onConfirm(
      trimmed && trimmed.length > 0 ? trimmed : undefined,
      startDate,
      endDate
    );
    onClose();
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg">Set Facility Unavailable</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-3">
          {/* Calendar */}
          <div>
            <Label className="mb-2 block text-sm">Select dates</Label>
            <div className="border rounded-lg p-3 bg-white">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevMonth}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <h3 className="font-medium text-sm text-gray-900">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextMonth}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {dayNames.map((day) => (
                  <div key={day} className="text-center text-[10px] font-medium text-gray-500 py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {getCalendarDays().map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="h-8" />;
                  }

                  const dateKey = formatDateKey(date);
                  const isSelected = selectedDates.has(dateKey);
                  const disabled = isDateDisabled(date);

                  return (
                    <button
                      key={dateKey}
                      onClick={() => toggleDate(date)}
                      disabled={disabled}
                      className={`
                        h-8 rounded text-xs font-medium transition-all
                        ${disabled 
                          ? 'text-gray-300 cursor-not-allowed bg-gray-50' 
                          : isSelected
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'text-gray-700 hover:bg-gray-100 border border-gray-200'
                        }
                      `}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              {selectedDates.size > 0 && (
                <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                  <p className="text-xs font-medium text-red-800">
                    {selectedDates.size} date{selectedDates.size !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Reason textarea */}
          <div>
            <Label className="mb-1.5 block text-sm">Reason (optional)</Label>
            <Textarea 
              value={reason} 
              onChange={(e) => setReason((e.target as HTMLTextAreaElement).value)} 
              className="min-h-[80px] text-sm"
              placeholder="Enter reason for unavailability..."
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
          <Button 
            onClick={handleConfirm}
            disabled={selectedDates.size === 0}
            className="bg-red-600 hover:bg-red-700 text-white"
            size="sm"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

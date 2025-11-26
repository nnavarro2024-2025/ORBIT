import { useMemo, useState } from "react";
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
  alreadyUnavailableDates?: string[];
}

const buildDefaultReason = (facility: UnavailableReasonModalProps["facility"]) => {
  if (!facility) return "";
  return facility.name
    ? `${facility.name} is temporarily unavailable due to maintenance. We apologize for the inconvenience.`
    : "This room is temporarily unavailable. Please contact staff for more information.";
};

interface ModalContentProps {
  facility: UnavailableReasonModalProps["facility"];
  alreadyUnavailableDates: string[];
  onConfirm: UnavailableReasonModalProps["onConfirm"];
  onClose: UnavailableReasonModalProps["onClose"];
}

function UnavailableReasonModalContent({ facility, alreadyUnavailableDates, onConfirm, onClose }: ModalContentProps) {
  const [reason, setReason] = useState<string>(() => buildDefaultReason(facility));
  const [selectedDates, setSelectedDates] = useState<Set<string>>(() => new Set());
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate <= today;
  };

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const toggleDate = (date: Date) => {
    if (isDateDisabled(date)) return;
    const dateKey = formatDateKey(date);
    if (alreadyUnavailableDates.includes(dateKey)) return;
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  const prevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const handleConfirm = () => {
    const trimmed = reason.trim();
    const dates = Array.from(selectedDates).sort();
    const startDate = dates.length > 0 ? dates[0] : undefined;
    const endDate = dates.length > 0 ? dates[dates.length - 1] : undefined;

    onConfirm(trimmed.length > 0 ? trimmed : undefined, startDate, endDate);
    onClose();
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle className="text-lg">Set Facility Unavailable</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-3">
        <div>
          <Label className="mb-2 block text-sm">Select dates</Label>
          <div className="border rounded-lg p-3 bg-white">
            <div className="flex items-center justify-between mb-3">
              <Button variant="outline" size="sm" onClick={prevMonth} className="h-7 w-7 p-0">
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <h3 className="font-medium text-sm text-gray-900">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>
              <Button variant="outline" size="sm" onClick={nextMonth} className="h-7 w-7 p-0">
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {dayNames.map((day) => (
                <div key={day} className="text-center text-[10px] font-medium text-gray-500 py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {getCalendarDays().map((date, index) => {
                if (!date) return <div key={`empty-${index}`} className="h-9" />;
                const dateKey = formatDateKey(date);
                const isUnavailable = alreadyUnavailableDates.includes(dateKey);
                const isSelected = selectedDates.has(dateKey);
                const disabled = isDateDisabled(date) || isUnavailable;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => toggleDate(date)}
                    disabled={disabled}
                    className={
                      `h-9 rounded text-xs transition border ${
                        disabled
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : isSelected
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-700 hover:bg-blue-50 border-gray-200"
                      }`
                    }
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="unavailable-reason" className="mb-2 block text-sm">
            Reason for unavailability
          </Label>
          <Textarea
            id="unavailable-reason"
            placeholder="Provide a reason for marking this facility as unavailable."
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
          />
        </div>
      </div>
      <DialogFooter className="flex items-center justify-between">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={selectedDates.size === 0}>
          Confirm Unavailability
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default function UnavailableReasonModal({ isOpen, onClose, facility, onConfirm, alreadyUnavailableDates = [] }: UnavailableReasonModalProps) {
  const resetKey = useMemo(() => `${facility?.id ?? "none"}-${isOpen ? "open" : "closed"}`, [facility?.id, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <UnavailableReasonModalContent
        key={resetKey}
        facility={facility}
        alreadyUnavailableDates={alreadyUnavailableDates}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    </Dialog>
  );
}

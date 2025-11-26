import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MakeAvailableModalProps {
  isOpen: boolean;
  onClose: () => void;
  facility: any | null;
  alreadyUnavailableDates: string[]; // YYYY-MM-DD
  onConfirm: (options: { clearAll: boolean; startDate?: string; endDate?: string }) => void;
}

function MakeAvailableContent({ facility, alreadyUnavailableDates, onConfirm, onClose }: Omit<MakeAvailableModalProps, "isOpen">) {
  const [selectedDates, setSelectedDates] = useState<Set<string>>(() => new Set());
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [clearAll, setClearAll] = useState(false);

  const blocked = useMemo(() => new Set(alreadyUnavailableDates || []), [alreadyUnavailableDates]);

  const formatKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  const toggleDate = (date: Date) => {
    const key = formatKey(date);
    if (!blocked.has(key)) return; // only allow selecting currently blocked dates
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const prevMonth = () => setCurrentMonth((p) => new Date(p.getFullYear(), p.getMonth() - 1));
  const nextMonth = () => setCurrentMonth((p) => new Date(p.getFullYear(), p.getMonth() + 1));

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  };

  const onSubmit = () => {
    if (clearAll) {
      onConfirm({ clearAll: true });
      onClose();
      return;
    }
    if (selectedDates.size === 0) return;
    const sorted = Array.from(selectedDates).sort();
    onConfirm({ clearAll: false, startDate: sorted[0], endDate: sorted[sorted.length - 1] });
    onClose();
  };

  const monthNames = [
    "January","February","March","April","May","June","July","August","September","October","November","December",
  ];
  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle className="text-lg">Make Facility Available</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input id="clear-all" type="checkbox" checked={clearAll} onChange={(e) => setClearAll(e.target.checked)} />
            <Label htmlFor="clear-all" className="text-sm">Clear all blocked dates</Label>
          </div>
        </div>

        {!clearAll && (
          <div>
            <Label className="mb-2 block text-sm">Select blocked dates to clear</Label>
            <div className="border rounded-lg p-3 bg-white">
              <div className="flex items-center justify-between mb-3">
                <Button variant="outline" size="sm" onClick={prevMonth} className="h-7 w-7 p-0">
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <h3 className="font-medium text-sm text-gray-900">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
                <Button variant="outline" size="sm" onClick={nextMonth} className="h-7 w-7 p-0">
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {dayNames.map((day) => (
                  <div key={day} className="text-center text-[10px] font-medium text-gray-500 py-1">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {getCalendarDays().map((date, idx) => {
                  if (!date) return <div key={`empty-${idx}`} className="h-9" />;
                  const key = formatKey(date);
                  const isBlocked = blocked.has(key);
                  const isSelected = selectedDates.has(key);
                  const disabled = !isBlocked; // can only select blocked days
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleDate(date)}
                      disabled={disabled}
                      className={`h-9 rounded text-xs transition border ${
                        disabled
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : isSelected
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-white text-gray-700 hover:bg-green-50 border-gray-200"
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      <DialogFooter className="flex items-center justify-between">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={onSubmit} disabled={!clearAll && selectedDates.size === 0}>Confirm</Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default function MakeAvailableModal({ isOpen, onClose, facility, onConfirm, alreadyUnavailableDates }: MakeAvailableModalProps) {
  const resetKey = useMemo(() => `${facility?.id ?? "none"}-${isOpen ? "open" : "closed"}`, [facility?.id, isOpen]);
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <MakeAvailableContent
        key={resetKey}
        facility={facility}
        alreadyUnavailableDates={alreadyUnavailableDates}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    </Dialog>
  );
}

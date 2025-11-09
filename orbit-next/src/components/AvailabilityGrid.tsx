import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

interface SlotItem {
  start: string;
  end: string;
  status: 'available' | 'scheduled' | 'unavailable';
  bookings?: Array<{ id: string; startTime: string; endTime: string; status: string; userId?: string }>
}

interface FacilityAvailability {
  facility: { id: number; name: string; capacity: number; isActive: boolean };
  maxUsageHours: number | null;
  slots: SlotItem[];
}

// Helper to format facility name for display
const formatFacilityName = (name: string) => {
  if (!name) return name;
  const lower = name.toLowerCase();
  // Ensure proper facility naming - add "Facility" prefix if missing for Lounge
  if (lower === 'lounge' && !lower.includes('facility')) {
    return 'Facility Lounge';
  }
  return name;
};

export default function AvailabilityGrid({ date, onSelectRange, unavailableDatesByFacility }: { date?: Date; onSelectRange?: (facilityId: number, startIso: string, endIso: string) => void, unavailableDatesByFacility?: Record<string, string[]> }) {
  // --- Always call hooks at the top level ---
  const { user } = useAuth();
  const [selectedRoomId, setSelectedRoomId] = useState<number|null>(null);
  const [showAvailable, setShowAvailable] = useState(true);
  const [showUnavailable, setShowUnavailable] = useState(true);
  const [showScheduled, setShowScheduled] = useState(true);
  // selectedDate is writable so users can toggle between days/months
  const [selectedDate, _setSelectedDate] = useState<Date>(() => {
    if (date) return date;
    const now = new Date();
    // If current time is 7:00 PM (19:00) or later, default to the next day
    const minutes = now.getHours() * 60 + now.getMinutes();
    const closeMinutes = 19 * 60; // 19:00
    if (minutes >= closeMinutes) {
      const t = new Date(now);
      t.setDate(t.getDate() + 1);
      t.setHours(0, 0, 0, 0);
      return t;
    }
    // Otherwise default to today at local midnight
    const t = new Date(now);
    t.setHours(0, 0, 0, 0);
    return t;
  });
  // When date changes, reset selectedRoomId to force user to reselect and avoid white screen
  const setSelectedDate = (d: Date) => {
    _setSelectedDate(d);
    setSelectedRoomId(null);
  };
  const dateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/availability', dateStr],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/availability?date=${dateStr}`);
      return res.json();
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  if (isLoading) return <div className="py-6">Loading availability…</div>;
  if (error) return (
    <div className="py-6 text-sm text-red-600">
      Failed to load availability
      <div className="mt-2">
        <button onClick={() => refetch()} className="px-3 py-1 bg-pink-600 text-white rounded text-sm">Retry</button>
      </div>
    </div>
  );

  const facilities: FacilityAvailability[] = (data && data.data) || [];


  // --- Calendar grid setup ---
  // Weekdays: Mon-Sat, hours: 7:30-19:00 (Mon–Fri), 7:30-12:00 (Sat), hourly slots
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  // 7:30, 8:30, ..., 18:30 (Mon–Fri), 7:30–11:30 (Sat)
  const hours = Array.from({ length: 12 }, (_, i) => 7.5 + i); // 7:30 to 18:30
  const satHours = Array.from({ length: 5 }, (_, i) => 7.5 + i); // 7:30 to 11:30
  const today = new Date();
  const weekStart = new Date(selectedDate);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // Monday
  // Helper: get date for each weekday in this week
  const getDateForDay = (d: number) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + d);
    return date;
  };

  // Helper: find slot for a facility, day, and hour (hourly slot)
  function findSlot(facility: FacilityAvailability, date: Date, hour: number) {
    // Find slot that matches this date and hour (hourly slot, start at :30)
    const slot = (facility.slots || []).find(s => {
      const slotStart = new Date(s.start);
      return slotStart.getFullYear() === date.getFullYear() &&
        slotStart.getMonth() === date.getMonth() &&
        slotStart.getDate() === date.getDate() &&
        slotStart.getHours() + slotStart.getMinutes() / 60 === hour;
    });
    return slot;
  }

  // --- Room list for sidebar (per role) ---
  // Define which roles can see which rooms
  const roomRoleMap: Record<string, Array<'student' | 'faculty' | 'admin'>> = {
    'Collaborative Learning 1': ['student', 'admin'],
    'Collaborative Learning 2': ['student', 'admin'],
    'Board Room': ['faculty', 'admin'],
    'Facility Lounge': ['faculty', 'admin'],
  };
  const roomList = [
    { name: 'Collaborative Learning 1', match: /collaborative learning room 1/i },
    { name: 'Collaborative Learning 2', match: /collaborative learning room 2/i },
    { name: 'Board Room', match: /board room/i },
    { name: 'Facility Lounge', match: /lounge|facility lounge/i },
  ];
  // Map roomList to facility ids
  const roomMap = facilities.reduce((acc, f) => {
    const found = roomList.find(r => r.match.test(f.facility.name));
    if (found) acc[found.name] = f.facility.id;
    return acc;
  }, {} as Record<string, number>);
  // Filter rooms by user role
  const userRole = user?.role || 'student';
  const filteredRoomList = roomList.filter(room => (roomRoleMap[room.name] || []).includes(userRole));

  // --- Sidebar mini calendar (interactive) ---
  const renderMiniCalendar = () => {
    const month = selectedDate.getMonth();
    const year = selectedDate.getFullYear();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);

    // Handlers for prev/next month
    const handlePrevMonth = () => {
  const prev = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
  setSelectedDate(prev);
    };
    const handleNextMonth = () => {
  const next = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
  setSelectedDate(next);
    };

    // Handler for selecting a day
    const handleSelectDay = (d: number | null) => {
  if (!d) return;
  // Always set time to midnight and create a new Date instance for React state
  const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d, 0, 0, 0, 0);
  setSelectedDate(newDate);
    };

    return (
      <div className="bg-white rounded-lg p-2 md:p-3 shadow-sm mb-4 w-full max-w-xs mx-auto md:mx-0">
        <div className="flex items-center justify-between mb-2">
          <button onClick={handlePrevMonth} className="px-2 py-1 text-gray-500 hover:text-blue-600" aria-label="Previous month">&#8592;</button>
          <span className="font-semibold text-sm">{format(selectedDate, 'MMMM yyyy')}</span>
          <button onClick={handleNextMonth} className="px-2 py-1 text-gray-500 hover:text-blue-600" aria-label="Next month">&#8594;</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs text-center text-gray-500 mb-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={d + i}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            const isSelected = d === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
            const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            return (
              <button
                key={i}
                className={`w-6 h-6 md:w-6 md:h-6 flex items-center justify-center rounded-full transition-all duration-75
                  ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}
                  ${isToday && !isSelected ? 'border-2 border-blue-600 bg-blue-100 text-blue-900 font-bold shadow-lg' : ''}
                  ${isToday && isSelected ? 'ring-4 ring-blue-300 border-2 border-blue-700 bg-blue-700 text-white font-bold shadow-lg' : ''}
                `}
                style={{ outline: isSelected ? '2px solid #2563eb' : undefined }}
                onClick={() => handleSelectDay(d)}
                tabIndex={d ? 0 : -1}
                disabled={!d}
              >
                {d || ''}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // --- Sidebar legend ---
  const renderLegend = () => (
    <div className="mt-6 space-y-2">
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={showUnavailable} onChange={e => setShowUnavailable(e.target.checked)} className="accent-red-500" />
        <span className="w-3 h-3 rounded bg-red-500 inline-block"></span>
        <span className="text-xs">Unavailable</span>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={showScheduled} onChange={e => setShowScheduled(e.target.checked)} className="accent-yellow-400" />
        <span className="w-3 h-3 rounded bg-yellow-400 inline-block"></span>
        <span className="text-xs">Scheduled</span>
      </div>
    </div>
  );

  // --- Main calendar grid, only for selected room ---
  const renderGrid = () => {
  const facility = facilities.find(f => f.facility.id === selectedRoomId);
  // Get unavailable dates for this facility (YYYY-MM-DD)
  const unavailableDates: string[] = unavailableDatesByFacility && facility ? (unavailableDatesByFacility[facility.facility.id] || []) : [];
    if (!facility) return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-base md:text-lg h-[200px] md:h-full min-h-[200px] md:min-h-[400px]">Select a room to view its schedule</div>
    );
    // If all school hours for the week are in the past, show only a single centered 'Unavailable' text
    const now = new Date();
    let allSchoolHoursPast = true;
    for (let dayIdx = 0; dayIdx < 6; dayIdx++) { // Mon-Sat
      const date = getDateForDay(dayIdx);
      const isSat = dayIdx === 5;
      const dayHours = isSat ? satHours : hours;
      for (let h of dayHours) {
        const slotTime = new Date(date);
        slotTime.setHours(Math.floor(h), (h % 1) * 60, 0, 0);
        const slotEnd = new Date(slotTime.getTime() + 60 * 60000);
        if (slotEnd > now) {
          allSchoolHoursPast = false;
          break;
        }
      }
      if (!allSchoolHoursPast) break;
    }
    if (allSchoolHoursPast) {
      return (
        <div className="flex-1 w-full overflow-x-auto flex items-center justify-center min-h-[400px]">
          <span className="text-2xl text-gray-500 font-semibold">Unavailable</span>
        </div>
      );
    }
    // Otherwise, show the normal grid
    return (
      <div className="flex-1 w-full overflow-x-auto">
        <div className="mb-4 md:mb-8">
          <div className="font-semibold text-base md:text-base mb-2 text-center md:text-left">{formatFacilityName(facility.facility.name)}</div>
          <div className="bg-white rounded-lg shadow-sm p-0">
            {/* Header: days of week */}
            <div className="grid grid-cols-6 border-b border-gray-200 text-xs md:text-xs" style={{ minWidth: 600 }}>
              {weekDays.map((d, i) => {
                const date = getDateForDay(i);
                return (
                  <div key={d} className="py-2 px-1 md:px-2 text-center font-semibold">
                    <span>{d}</span>
                    <div className="text-xs text-gray-500">{format(date, 'd')}</div>
                  </div>
                );
              })}
            </div>
            {/* Time grid */}
            <div className="relative">
              {/* Red timeline for current time removed */}
              <div className="grid grid-cols-6" style={{ minWidth: 600 }}>
                {weekDays.map((d, dayIdx) => {
                  const date = getDateForDay(dayIdx);
                  const isSat = dayIdx === 5;
                  const dayHours = isSat ? satHours : hours;
                  return (
                    <div key={d} className="border-r border-gray-200 last:border-r-0">
                      {dayHours.map((h, hIdx) => {
                        const slotTime = new Date(date);
                        slotTime.setHours(Math.floor(h), (h % 1) * 60, 0, 0);
                        // Find the real slot for this facility, day, and time
                        const slot = findSlot(facility, date, h);
                        let slotStatus: 'available' | 'unavailable' | 'scheduled' = 'available';
                        if (slot) slotStatus = slot.status;
                        // If the slot is in the past and not scheduled, force unavailable
                        const now = new Date();
                        const slotEnd = new Date(slot ? slot.end : slotTime.getTime() + 60 * 60000);
                        if (slotEnd < now && slotStatus !== 'scheduled') {
                          slotStatus = 'unavailable';
                        }
                        if ((slotStatus === 'available' && !showAvailable) || (slotStatus === 'unavailable' && !showUnavailable) || (slotStatus === 'scheduled' && !showScheduled)) {
                          return <div key={hIdx} className="h-10 md:h-12 border-b border-gray-100 bg-gray-50"></div>;
                        }
                        // Show unavailable tag if this day is marked unavailable and showUnavailable is true
                        const slotDateStr = `${slotTime.getFullYear()}-${String(slotTime.getMonth() + 1).padStart(2, '0')}-${String(slotTime.getDate()).padStart(2, '0')}`;
                        if (slotStatus === 'available') {
                          if (showUnavailable && unavailableDates.includes(slotDateStr)) {
                            return (
                              <div
                                key={hIdx}
                                className="h-10 md:h-12 flex items-center justify-center border-b border-gray-100 bg-red-100 text-xs text-red-700 font-semibold rounded-md m-0.5 md:m-1 shadow-sm"
                                style={{ minHeight: 36 }}
                                title="Unavailable"
                              >
                                Unavailable
                              </div>
                            );
                          }
                          return (
                            <div
                              key={hIdx}
                              className="h-10 md:h-12 cursor-pointer bg-white"
                              tabIndex={0}
                              style={{ minHeight: 36 }}
                              onClick={() => {
                                if (typeof onSelectRange === 'function') {
                                  onSelectRange(facility.facility.id, slot?.start || slotTime.toISOString(), slot?.end || new Date(slotTime.getTime() + 60 * 60000).toISOString());
                                }
                              }}
                            />
                          );
                        }
                        // Leave scheduled and unavailable slots unchanged
                        const color = slotStatus === 'scheduled' ? 'bg-yellow-400/80 hover:bg-yellow-500' : 'bg-red-400/80 hover:bg-red-500';
                        return (
                          <div
                            key={hIdx}
                            className={`h-10 md:h-12 border-b border-gray-100 flex items-center justify-center transition-all duration-150 ${color} text-xs md:text-xs text-white font-semibold rounded-md m-0.5 md:m-1 shadow-sm`}
                            title={`${slotStatus.charAt(0).toUpperCase() + slotStatus.slice(1)}: ${format(slotTime, 'hh:mm a')}`}
                            tabIndex={0}
                            style={{ minHeight: 36 }}
                          >
                            {format(slotTime, 'hh:mm a')}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- Main layout ---
  return (
    <div className="flex flex-col md:flex-row md:gap-6 gap-2 mt-4 md:mt-6">
      {/* Sidebar */}
      <aside className="w-full md:w-64 flex-shrink-0 mb-4 md:mb-0">
        {renderMiniCalendar()}
        {renderLegend()}
        <div className="mt-6 md:mt-8">
          <div className="font-semibold text-xs md:text-xs text-gray-700 mb-2">Rooms</div>
          <div className="space-y-1">
            {filteredRoomList.map(room => (
              <button
                key={room.name}
                className={`w-full text-left px-3 py-2 rounded-lg transition font-medium text-sm flex items-center gap-2 ${selectedRoomId === roomMap[room.name] ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
                onClick={() => setSelectedRoomId(roomMap[room.name])}
                tabIndex={0}
              >
                {room.name}
              </button>
            ))}
          </div>
        </div>
      </aside>
      {/* Main calendar grid */}
      <div className="w-full overflow-x-auto">{renderGrid()}</div>
    </div>
  );
}

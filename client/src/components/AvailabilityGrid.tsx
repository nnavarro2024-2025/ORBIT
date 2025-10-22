import { useMemo, useState } from 'react';
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

export default function AvailabilityGrid({ date, onSelectRange }: { date?: Date; onSelectRange?: (facilityId: number, startIso: string, endIso: string) => void }) {
  const now = new Date();
  // selectedDate is writable so users can toggle between today / next day
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
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
  const dateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
  const isShiftedToNextDay = useMemo(() => {
    if (date) return false;
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    return minutes >= 19 * 60;
  }, [date]);

  // Helper to create a midnight-local Date for today or next day
  const dateForMode = (mode: 'today' | 'next') => {
    const now = new Date();
    const t = new Date(now);
    if (mode === 'next') {
      t.setDate(t.getDate() + 1);
    }
    t.setHours(0, 0, 0, 0);
    return t;
  };

  // Track which facility's full list is open. Keep hooks at the top-level
  // so they are always called in the same order across renders.
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({});

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


  // Helper: merge contiguous slots with same status into readable ranges
    const mergeSlotsToRanges = (slots: SlotItem[]) => {
    const ranges: Array<{ start: string; end: string; status: string; bookings?: any[] }> = [];
    if (!slots || slots.length === 0) return ranges;
    // Treat past slots as 'unavailable' for the purpose of merging, 
    // but preserve 'scheduled' status if there are active/future bookings
    const now = new Date();
    const normalized = slots.map(s => {
      try {
        const slotEnd = new Date(s.end).getTime();
        // Only mark as unavailable if the slot has ended AND it doesn't have scheduled bookings
        if (slotEnd <= now.getTime() && s.status !== 'scheduled') {
          return { ...s, status: 'unavailable' };
        }
        return s;
      } catch (e) { return s; }
    });
    let cur = { start: normalized[0].start, end: normalized[0].end, status: normalized[0].status, bookings: normalized[0].bookings || [] };
    for (let i = 1; i < slots.length; i++) {
      const s = normalized[i];
      if (s.status === cur.status) {
        // extend
        cur.end = s.end;
        if (s.bookings && s.bookings.length > 0) cur.bookings = (cur.bookings || []).concat(s.bookings);
      } else {
        ranges.push(cur);
        cur = { start: s.start, end: s.end, status: s.status, bookings: s.bookings || [] };
      }
    }
    ranges.push(cur);
    // Convert any ranges that end in the past to 'unavailable' so they don't show as 'Scheduled'
      // reuse existing now variable from outer scope if available
      // const now = (typeof window !== 'undefined') ? new Date() : new Date();
    for (const r of ranges) {
      try {
        if (new Date(r.end).getTime() <= now.getTime()) {
          r.status = 'unavailable';
        }
      } catch (e) {
        // ignore parsing errors
      }
    }
    // Deduplicate bookings inside each merged range. Sometimes the same booking
    // appears in multiple contiguous 30-min slots and gets concatenated; remove
    // duplicates by booking id or by a start/end/status signature.
    // Also filter out active bookings from 'unavailable' ranges - they should only appear in 'scheduled' ranges.
    for (const r of ranges) {
      try {
        if (!r.bookings || !Array.isArray(r.bookings) || r.bookings.length === 0) continue;
        const seen = new Set();
        const dedup: any[] = [];
        for (const b of r.bookings) {
          if (!b) continue;
          const key = b.id ? String(b.id) : `${b.startTime || b.start}-${b.endTime || b.end}-${b.status || ''}`;
          if (!seen.has(key)) {
            // Don't show approved/pending bookings in unavailable ranges - they belong in scheduled ranges only
            const bookingStatus = String(b.status || '').toLowerCase();
            if (r.status === 'unavailable' && (bookingStatus === 'approved' || bookingStatus === 'pending')) {
              continue;
            }
            seen.add(key);
            dedup.push(b);
          }
        }
        r.bookings = dedup;
      } catch (e) {
        // ignore dedupe errors
      }
    }
    // If a merged 'scheduled' range contains explicit bookings, snap the
    // displayed range to the min start / max end across those bookings so the
    // human-facing 'Scheduled' time doesn't extend beyond the actual bookings.
    for (const r of ranges) {
      try {
        if (r.status !== 'scheduled') continue;
        if (!r.bookings || !Array.isArray(r.bookings) || r.bookings.length === 0) continue;
        let minStart: number | null = null;
        let maxEnd: number | null = null;
        for (const b of r.bookings) {
          try {
            const s = new Date(b.startTime || b.start).getTime();
            const e = new Date(b.endTime || b.end).getTime();
            if (isNaN(s) || isNaN(e)) continue;
            if (minStart === null || s < minStart) minStart = s;
            if (maxEnd === null || e > maxEnd) maxEnd = e;
          } catch (ex) {
            // ignore
          }
        }
        if (minStart !== null && maxEnd !== null) {
          r.start = new Date(minStart).toISOString();
          r.end = new Date(maxEnd).toISOString();
        }
      } catch (e) {
        // ignore
      }
    }
    return ranges;
  };

  return (
    <div className="mt-6 space-y-4">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
    <div className="text-xs sm:text-sm text-gray-600 break-words">Showing availability for <strong>{dateStr}</strong>{isShiftedToNextDay ? ' (next day)' : ''}</div>
    {!date && (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSelectedDate(dateForMode('today'))}
          className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm whitespace-nowrap ${format(selectedDate, 'yyyy-MM-dd') === format(dateForMode('today'), 'yyyy-MM-dd') ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Today
        </button>
        <button
          onClick={() => setSelectedDate(dateForMode('next'))}
          className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm whitespace-nowrap ${format(selectedDate, 'yyyy-MM-dd') === format(dateForMode('next'), 'yyyy-MM-dd') ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}>
          Next day
        </button>
      </div>
    )}
  </div>
      {facilities.map((f) => {
        const open = !!openMap[f.facility.id];
        const ranges = mergeSlotsToRanges(f.slots);

        return (
          <div key={f.facility.id} className="bg-white border rounded-lg p-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm sm:text-base truncate">{formatFacilityName(f.facility.name)}</div>
                <div className="text-xs text-gray-500">Capacity: {f.facility.capacity} {f.maxUsageHours ? `• Max ${f.maxUsageHours}h` : ''}</div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <div className="text-xs text-gray-500 whitespace-nowrap">Slots: {f.slots.length}</div>
                <button onClick={() => setOpenMap(prev => ({ ...prev, [f.facility.id]: !prev[f.facility.id] }))} className="px-2 py-1 rounded text-xs sm:text-sm bg-gray-100 whitespace-nowrap">{open ? 'Hide list' : 'Show full list'}</button>
              </div>
            </div>

            <div className="w-full overflow-auto mb-3">
              <div className="flex gap-1 items-center" style={{ minWidth: Math.max(640, f.slots.length * 28) }}>
                        {(() => {
                          // Compute derived slots: mark any slot that ended already as 'unavailable'
                          const computedSlots = (f.slots || []).map(s => {
                            try {
                              const slotEnd = new Date(s.end);
                              if (slotEnd.getTime() <= now.getTime()) {
                                return { ...s, status: 'unavailable' } as any;
                              }
                              return s;
                            } catch (e) {
                              return s;
                            }
                          });

                          return computedSlots.map((s: any, idx: number) => {
                            const isAvailable = s.status === 'available';
                            const isScheduled = s.status === 'scheduled';
                            const isUnavailable = s.status === 'unavailable';
                            const bg = isAvailable ? 'bg-green-100' : isScheduled ? 'bg-yellow-100' : 'bg-gray-100';
                            const border = isAvailable ? 'border-green-200' : isScheduled ? 'border-yellow-200' : 'border-gray-200';
                            const title = isAvailable
                              ? `Available ${new Date(s.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${new Date(s.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                              : isScheduled
                                ? `Scheduled: ${s.bookings && s.bookings.map((b: any) => `${new Date(b.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}-${new Date(b.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`).join(', ')}`
                                : `Unavailable ${new Date(s.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;

                            return (
                              <div
                                key={`${f.facility.id}-${idx}`}
                                title={title}
                                className={`flex-shrink-0 w-7 h-7 rounded-sm border ${border} ${bg} flex items-center justify-center text-[10px] ${isUnavailable ? 'text-gray-400' : 'text-gray-700'}`}
                              >
                                {isAvailable ? '' : (isScheduled ? '⭑' : '')}
                              </div>
                            );
                          });
                        })()}
              </div>
            </div>

            {open && (
              <div className="mt-2">
                <div className="text-sm font-medium mb-2">Full Day List</div>
                <div className="space-y-1 text-sm">
                  {(() => {
                    // Track bookings already displayed for this facility so duplicates
                    // across adjacent/merged ranges are only shown once.
                    const facilitySeen = new Set<string>();
                    const nodes: any[] = [];
                    for (let idx = 0; idx < ranges.length; idx++) {
                      const r = ranges[idx];
                      nodes.push(
                        <div
                          key={idx}
                          onClick={() => {
                            if (r.status === 'available' && typeof onSelectRange === 'function') {
                              onSelectRange(f.facility.id, r.start, r.end);
                            }
                          }}
                          className={`p-2 rounded cursor-pointer ${r.status === 'available' ? 'bg-green-50 hover:bg-green-100' : r.status === 'scheduled' ? 'bg-yellow-50' : 'bg-gray-50'} border ${r.status === 'available' ? 'border-green-100' : r.status === 'scheduled' ? 'border-yellow-100' : 'border-gray-100'}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs text-gray-700 font-medium">{r.status === 'available' ? 'Available' : r.status === 'scheduled' ? 'Scheduled' : 'Unavailable'}</div>
                              {/* Only show the merged range time if there's 0 or 1 booking - otherwise show individual times below */}
                              {(!r.bookings || r.bookings.length <= 1) && (
                                <div className="text-xs text-gray-600">{format(new Date(r.start), 'hh:mm a')} - {format(new Date(r.end), 'hh:mm a')}</div>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(() => {
                                if (!r.bookings || !Array.isArray(r.bookings) || r.bookings.length === 0) return '';
                                const uniq = new Set(r.bookings.map((b: any) => b.id ? String(b.id) : `${b.startTime || b.start}-${b.endTime || b.end}-${b.status || ''}`));
                                const n = uniq.size;
                                return `${n} booking${n > 1 ? 's' : ''}`;
                              })()}
                            </div>
                          </div>
                          {r.bookings && r.bookings.length > 1 && (
                            <div className="mt-1 text-xs text-gray-600">
                              {(() => {
                                const out: any[] = [];
                                for (const b of r.bookings) {
                                  if (!b) continue;
                                  const key = b.id ? String(b.id) : `${b.startTime || b.start}-${b.endTime || b.end}-${b.status || ''}`;
                                  if (facilitySeen.has(key)) continue;
                                  
                                  facilitySeen.add(key);
                                  // Map booking status to user-friendly labels
                                  let statusLabel = '';
                                  const rawStatus = String(b.status || '').toLowerCase();
                                  if (rawStatus === 'approved' || rawStatus === 'pending') {
                                    // Don't show status for approved/pending - it's implied by "Scheduled"
                                    statusLabel = '';
                                  } else if (rawStatus === 'denied') {
                                    statusLabel = ' • Denied';
                                  } else if (rawStatus === 'cancelled') {
                                    statusLabel = ' • Cancelled';
                                  }
                                  
                                  out.push(
                                    <div key={key}>{format(new Date(b.startTime || b.start), 'hh:mm a')} - {format(new Date(b.endTime || b.end), 'hh:mm a')}{statusLabel}</div>
                                  );
                                }
                                return out.length > 0 ? out : null;
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return nodes;
                  })()}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

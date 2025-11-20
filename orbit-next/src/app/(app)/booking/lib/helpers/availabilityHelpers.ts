import { format } from 'date-fns';
import { DAILY_START_HOUR, DAILY_END_HOUR, SLOT_DURATION_MINUTES } from '../../config/constants';

/**
 * Generate mock availability slots for facilities
 */
export function generateMockForFacilities(facList: any[]) {
  const mockArr: any[] = [];
  for (const f of facList) {
    const slots: any[] = [];
    const dayStart = new Date(); 
    dayStart.setHours(7, 30, 0, 0);
    const slotCount = (DAILY_END_HOUR - DAILY_START_HOUR) * 2; // number of 30-min slots
    
    for (let i = 0; i < slotCount; i++) {
      const s = new Date(dayStart.getTime() + i * SLOT_DURATION_MINUTES * 60 * 1000);
      const e = new Date(s.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);
      const hour = s.getHours();
      const status = (hour >= 11 && hour < 13 && f.id % 2 === 0) ? 'scheduled' : 'available';
      slots.push({ 
        start: s.toISOString(), 
        end: e.toISOString(), 
        status, 
        bookings: status === 'scheduled' ? [{
          startTime: s.toISOString(), 
          endTime: e.toISOString(), 
          status: 'approved', 
          id: `mock-${f.id}-${i}` 
        }] : [] 
      });
    }
    
    // Guarantee at least one future 'available' slot
    try {
      const now = new Date();
      const hasFutureAvailable = slots.some(s => new Date(s.start) > now && s.status === 'available');
      if (!hasFutureAvailable) {
        for (let i = 0; i < slots.length; i++) {
          if (new Date(slots[i].start) > now) {
            slots[i].status = 'available';
            slots[i].bookings = [];
            break;
          }
        }
      }
    } catch (e) {
      // noop
    }
    
    mockArr.push({ 
      facility: { 
        id: f.id, 
        name: f.name, 
        capacity: f.capacity, 
        isActive: f.isActive 
      }, 
      maxUsageHours: null, 
      slots 
    });
  }
  return new Map<number, any>(mockArr.map((d: any) => [d.facility.id, d]));
}

/**
 * Build unavailable dates map from facilities
 */
export function buildUnavailableDatesByFacility(facilities: any[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const f of facilities) {
    if (Array.isArray(f.unavailableDates)) {
      const days: string[] = [];
      for (const range of f.unavailableDates) {
        if (range && range.startDate && range.endDate) {
          const start = new Date(range.startDate);
          const end = new Date(range.endDate);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            days.push(d.toISOString().slice(0, 10));
          }
        }
      }
      map[f.id] = days;
    } else {
      map[f.id] = [];
    }
  }
  return map;
}

/**
 * Pick an available slot from availability entry
 */
export function pickAvailableSlot(entry: any, now: Date) {
  if (!entry || !Array.isArray(entry.slots)) return null;
  return entry.slots.find((s: any) => {
    try {
      return s.status === 'available' && 
             new Date(s.end).getTime() > now.getTime() && 
             new Date(s.start).getTime() >= now.getTime();
    } catch (e) { 
      return false; 
    }
  }) || null;
}

/**
 * Find earliest available slot across all availability entries
 */
export function findEarliestAvailableSlot(availabilityMap: Map<number, any>, now: Date) {
  let earliestSlot: any = null;
  for (const [, entry] of availabilityMap) {
    if (!entry || !Array.isArray(entry.slots)) continue;
    for (const s of entry.slots) {
      try {
        if (s.status !== 'available') continue;
        const sStart = new Date(s.start);
        const sEnd = new Date(s.end);
        if (sEnd.getTime() <= now.getTime()) continue;
        if (sStart.getTime() < now.getTime()) continue;
        if (!earliestSlot || new Date(s.start) < new Date(earliestSlot.start)) {
          earliestSlot = s;
        }
      } catch (e) {
        // ignore parse errors
      }
    }
  }
  return earliestSlot;
}

/**
 * Slot Management Utilities
 * 
 * Functions for managing time slots, slot holds, and availability
 */

import { format } from 'date-fns';
import { apiRequest } from '@/lib/api';
import {
  BOOKING_MIN_DURATION_MS,
  BOOKING_MAX_DURATION_MS,
} from '@shared/bookingRules';
import { getLibraryWindow, SLOT_INTERVAL_MINUTES } from './dateTimeUtils';
import type { SerializedSlotHold } from '../hooks/useSlotManagement';

export interface AvailableSlot {
  start: Date;
  end: Date;
  source: 'api' | 'fallback';
}

// Re-export types from hooks
export type { SerializedSlotHold, ConflictEntry } from '../hooks/useSlotManagement';

/**
 * Compute fallback available slots for a facility on a given date
 */
export function computeFallbackSlots(
  facilityId: number,
  dateKey: string,
  allBookings: any[]
): AvailableSlot[] {
  try {
    const targetDate = new Date(dateKey);
    if (Number.isNaN(targetDate.getTime())) return [];

    const { open, close } = getLibraryWindow(targetDate);
    const facilityBookings = allBookings.filter((b: any) => {
      if (b.facilityId !== facilityId) return false;
      if (b.status !== 'approved' && b.status !== 'pending') return false;
      const bStart = new Date(b.startTime);
      return format(bStart, 'yyyy-MM-dd') === dateKey;
    });

    const slots: AvailableSlot[] = [];
    let cursor = new Date(open);

    while (cursor.getTime() + BOOKING_MIN_DURATION_MS <= close.getTime()) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + SLOT_INTERVAL_MINUTES * 60 * 1000);

      const overlaps = facilityBookings.some((b: any) => {
        const bStart = new Date(b.startTime).getTime();
        const bEnd = new Date(b.endTime).getTime();
        return slotStart.getTime() < bEnd && slotEnd.getTime() > bStart;
      });

      if (!overlaps && slotEnd.getTime() <= close.getTime()) {
        slots.push({ start: slotStart, end: slotEnd, source: 'fallback' });
      }

      cursor = slotEnd;
    }

    return slots;
  } catch (error) {
    console.error('[computeFallbackSlots] Error:', error);
    return [];
  }
}

/**
 * Find next available time slot for a facility
 */
export async function findNextAvailableSlot(
  facilityId: number | null,
  allBookings: any[],
  fromDate = new Date()
): Promise<{ start: Date; end: Date } | null> {
  if (!facilityId) return null;
  const MAX_DAYS = 2;
  const SLOT_MS = 30 * 60 * 1000;

  for (let dayOffset = 0; dayOffset < MAX_DAYS; dayOffset++) {
    const searchDate = new Date(fromDate);
    searchDate.setDate(searchDate.getDate() + dayOffset);
    searchDate.setHours(0, 0, 0, 0);

    const { open: startWindow, close: endWindow } = getLibraryWindow(searchDate);
    let cursor = dayOffset === 0 && fromDate > startWindow ? fromDate : startWindow;

    cursor.setSeconds(0, 0);
    const mins = cursor.getMinutes();
    const rem = mins % 30;
    if (rem !== 0) cursor.setMinutes(mins + (30 - rem));

    while (cursor.getTime() + SLOT_MS <= endWindow.getTime()) {
      const candidate = { start: new Date(cursor), end: new Date(cursor.getTime() + SLOT_MS) };
      const facilityBookings = allBookings.filter(
        (b: any) => b.facilityId === facilityId && (b.status === 'approved' || b.status === 'pending')
      );

      const overlaps = facilityBookings.some((b: any) => {
        const bStart = new Date(b.startTime).getTime();
        const bEnd = new Date(b.endTime).getTime();
        return candidate.start.getTime() < bEnd && candidate.end.getTime() > bStart;
      });

      if (!overlaps) {
        return candidate;
      }

      cursor = candidate.end;
    }
  }
  return null;
}

/**
 * Create or refresh a slot hold
 */
export async function acquireSlotHold(
  facilityId: number,
  startTime: Date,
  endTime: Date,
  existingHoldId?: string
): Promise<SerializedSlotHold> {
  const resp = await apiRequest('POST', '/api/booking-holds', {
    holdId: existingHoldId,
    facilityId,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  });
  const data = await resp.json();
  if (!data?.hold) throw new Error('Missing slot hold data');
  return data.hold;
}

/**
 * Release a slot hold
 */
export async function releaseSlotHold(holdId: string): Promise<void> {
  try {
    await apiRequest('DELETE', `/api/booking-holds?holdId=${encodeURIComponent(holdId)}`);
  } catch (error) {
    console.warn('[releaseSlotHold] Failed to release hold', error);
  }
}

/**
 * Refresh an existing slot hold
 */
export async function refreshSlotHold(holdId: string): Promise<{id: string; facilityId?: number; startTime?: string; endTime?: string; expiresAt: string}> {
  const resp = await apiRequest('PATCH', '/api/booking-holds', { holdId });
  const data = await resp.json();
  if (!data?.hold) throw new Error('Missing slot hold data');
  return data.hold;
}

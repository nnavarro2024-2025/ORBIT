import { randomUUID } from "crypto";

import { storage } from "@/server/core";
import type { FacilityBooking } from "@shared/schema";

const HOLD_TTL_MS = 2 * 60 * 1000; // 2 minutes
const HOLD_REFRESH_GRACE_MS = 15 * 1000; // refresh slightly before expiry

type SlotHold = {
  id: string;
  facilityId: number;
  startTime: Date;
  endTime: Date;
  userId: string;
  expiresAt: number;
};

type AcquireFailure = {
  ok: false;
  status: number;
  message: string;
  conflictingHoldExpiresAt?: string | null;
  conflictingBookings?: Array<Pick<FacilityBooking, "id" | "startTime" | "endTime" | "status" | "facilityId">>;
};

type AcquireSuccess = {
  ok: true;
  hold: SlotHold;
};

type AcquireResult = AcquireSuccess | AcquireFailure;

const activeHolds = new Map<string, SlotHold>();

const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
  aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();

const purgeExpiredHolds = (now = Date.now()) => {
  for (const [holdId, hold] of activeHolds.entries()) {
    if (hold.expiresAt <= now) {
      activeHolds.delete(holdId);
    }
  }
};

const normalizeDate = (value?: Date | null) =>
  value instanceof Date ? new Date(value) : undefined;

const clampToDayWindow = (reference: Date) => {
  const dayStart = new Date(reference);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return { dayStart, dayEnd };
};

const findFacilityConflicts = async (
  facilityId: number,
  start: Date,
  end: Date,
): Promise<FacilityBooking[]> => {
  try {
    const { dayStart, dayEnd } = clampToDayWindow(start);
    const bookings = await storage.getFacilityBookingsByDateRange(dayStart, dayEnd);
    return bookings.filter((booking) => {
      if (!booking) return false;
      if (booking.facilityId !== facilityId) return false;
      if (!booking.startTime || !booking.endTime) return false;
      if (booking.status !== "pending" && booking.status !== "approved") return false;
      const existingStart = new Date(booking.startTime);
      const existingEnd = new Date(booking.endTime);
      return overlaps(start, end, existingStart, existingEnd);
    });
  } catch (error) {
    console.warn("[bookingHolds] Failed to check facility conflicts", error);
    return [];
  }
};

const findHoldByUser = (userId: string): SlotHold | undefined => {
  for (const hold of activeHolds.values()) {
    if (hold.userId === userId) {
      return hold;
    }
  }
  return undefined;
};

const touchHold = (hold: SlotHold): SlotHold => {
  const updated: SlotHold = {
    ...hold,
    expiresAt: Date.now() + HOLD_TTL_MS - HOLD_REFRESH_GRACE_MS,
  };
  activeHolds.set(updated.id, updated);
  return updated;
};

export const serializeSlotHold = (hold: SlotHold) => ({
  id: hold.id,
  facilityId: hold.facilityId,
  startTime: hold.startTime.toISOString(),
  endTime: hold.endTime.toISOString(),
  expiresAt: new Date(hold.expiresAt).toISOString(),
});

export interface AcquireSlotHoldArgs {
  holdId?: string;
  facilityId?: number;
  startTime?: Date;
  endTime?: Date;
  userId: string;
}

export const acquireSlotHold = async ({
  holdId,
  facilityId,
  startTime,
  endTime,
  userId,
}: AcquireSlotHoldArgs): Promise<AcquireResult> => {
  purgeExpiredHolds();

  let existingHold: SlotHold | undefined;
  if (holdId) {
    existingHold = activeHolds.get(holdId);
    if (!existingHold) {
      return {
        ok: false,
        status: 404,
        message: "Slot hold not found or has already expired.",
      };
    }
    if (existingHold.userId !== userId) {
      return {
        ok: false,
        status: 403,
        message: "You do not have permission to update this slot hold.",
      };
    }
  }

  const resolvedFacilityId = typeof facilityId === "number" ? facilityId : existingHold?.facilityId;
  const resolvedStart = normalizeDate(startTime) ?? existingHold?.startTime;
  const resolvedEnd = normalizeDate(endTime) ?? existingHold?.endTime;

  if (typeof resolvedFacilityId !== "number" || !resolvedStart || !resolvedEnd) {
    return {
      ok: false,
      status: 400,
      message: "Facility, start time, and end time are required to acquire a slot hold.",
    };
  }

  if (resolvedEnd.getTime() <= resolvedStart.getTime()) {
    return {
      ok: false,
      status: 400,
      message: "End time must be after start time.",
    };
  }

  // Ensure user has at most one active hold
  if (!existingHold) {
    const priorHold = findHoldByUser(userId);
    if (priorHold) {
      activeHolds.delete(priorHold.id);
    }
  }

  // Check for conflicting holds from other users
  for (const hold of activeHolds.values()) {
    if (existingHold && hold.id === existingHold.id) continue;
    if (hold.facilityId !== resolvedFacilityId) continue;
    if (hold.userId === userId) continue;
    if (overlaps(resolvedStart, resolvedEnd, hold.startTime, hold.endTime)) {
      return {
        ok: false,
        status: 409,
        message: "Another user is currently holding this time slot.",
        conflictingHoldExpiresAt: new Date(hold.expiresAt).toISOString(),
      };
    }
  }

  // Check for conflicting pending/approved bookings
  const bookingConflicts = await findFacilityConflicts(resolvedFacilityId, resolvedStart, resolvedEnd);
  if (bookingConflicts.length > 0) {
    return {
      ok: false,
      status: 409,
      message: "This time slot overlaps with an existing booking.",
      conflictingBookings: bookingConflicts.map((booking) => ({
        id: booking.id,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        facilityId: booking.facilityId,
      })),
    };
  }

  const hold: SlotHold = existingHold
    ? {
        ...existingHold,
        facilityId: resolvedFacilityId,
        startTime: new Date(resolvedStart),
        endTime: new Date(resolvedEnd),
      }
    : {
        id: holdId ?? randomUUID(),
        facilityId: resolvedFacilityId,
        startTime: new Date(resolvedStart),
        endTime: new Date(resolvedEnd),
        userId,
        expiresAt: 0,
      };

  const updated = touchHold(hold);

  return {
    ok: true,
    hold: updated,
  };
};

export const refreshSlotHold = async (holdId: string, userId: string): Promise<AcquireResult> => {
  const existingHold = activeHolds.get(holdId);
  if (!existingHold) {
    return {
      ok: false,
      status: 404,
      message: "Slot hold not found or has already expired.",
    };
  }

  if (existingHold.userId !== userId) {
    return {
      ok: false,
      status: 403,
      message: "You do not have permission to refresh this slot hold.",
    };
  }

  const refreshed = touchHold(existingHold);
  return { ok: true, hold: refreshed };
};

export const releaseSlotHold = (holdId: string, userId?: string) => {
  const hold = activeHolds.get(holdId);
  if (!hold) {
    return {
      ok: false,
      status: 404,
      message: "Slot hold not found or has already been released.",
    } as const;
  }

  if (userId && hold.userId !== userId) {
    return {
      ok: false,
      status: 403,
      message: "You do not have permission to release this slot hold.",
    } as const;
  }

  activeHolds.delete(holdId);
  return { ok: true } as const;
};

export const releaseAllHoldsForUser = (userId: string) => {
  let released = 0;
  for (const [holdId, hold] of activeHolds.entries()) {
    if (hold.userId === userId) {
      activeHolds.delete(holdId);
      released += 1;
    }
  }
  return released;
};

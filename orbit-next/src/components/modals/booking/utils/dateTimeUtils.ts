/**
 * Date and Time Utility Functions for Booking Modal
 * 
 * Handles library hours, time slot calculations, and date normalization
 */

import { format } from 'date-fns';
import {
  BOOKING_MAX_DURATION_MS,
  BOOKING_MIN_DURATION_MS,
} from "@shared/bookingRules";

// Library operating hours
export const LIBRARY_OPEN_HOUR = 7;
export const LIBRARY_OPEN_MINUTE = 30;
export const LIBRARY_CLOSE_HOUR = 19;
export const LIBRARY_CLOSE_MINUTE = 0;
export const SLOT_INTERVAL_MINUTES = 30;

/**
 * Get start of day (midnight) for a given date
 */
export function startOfDay(value: Date): Date {
  const copy = new Date(value);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Check if two dates are on the same calendar day
 */
export function isSameCalendarDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/**
 * Check if a date is before today
 */
export function isDateBeforeToday(value: Date): boolean {
  return startOfDay(value).getTime() < startOfDay(new Date()).getTime();
}

/**
 * Get library opening and closing times for a given date
 */
export function getLibraryWindow(reference: Date): { open: Date; close: Date } {
  const open = new Date(reference);
  open.setHours(LIBRARY_OPEN_HOUR, LIBRARY_OPEN_MINUTE, 0, 0);
  const close = new Date(reference);
  close.setHours(LIBRARY_CLOSE_HOUR, LIBRARY_CLOSE_MINUTE, 0, 0);
  return { open, close };
}

/**
 * Round up time to the nearest interval
 */
export function roundUpToInterval(value: Date, minutes: number): Date {
  const result = new Date(value);
  result.setSeconds(0, 0);
  const intervalMs = minutes * 60 * 1000;
  const remainder = result.getTime() % intervalMs;
  if (remainder === 0) return result;
  result.setTime(result.getTime() + (intervalMs - remainder));
  return result;
}

/**
 * Clamp start time to library hours
 */
export function clampStartToLibrary(candidate: Date): Date {
  const { open, close } = getLibraryWindow(candidate);
  const latestStart = new Date(Math.max(open.getTime(), close.getTime() - BOOKING_MIN_DURATION_MS));
  if (candidate.getTime() < open.getTime()) return open;
  if (candidate.getTime() > latestStart.getTime()) return latestStart;
  return candidate;
}

/**
 * Clamp end time to library hours
 */
export function clampEndToLibrary(candidate: Date, start: Date): Date {
  const { close } = getLibraryWindow(start);
  if (candidate.getTime() > close.getTime()) return close;
  if (candidate.getTime() <= start.getTime()) {
    return new Date(Math.min(close.getTime(), start.getTime() + BOOKING_MIN_DURATION_MS));
  }
  return candidate;
}

/**
 * Get the next available start time (handles current day and next day)
 */
export function getNextAvailableStart(): Date {
  const now = new Date();
  const { open: todayOpen, close: todayClose } = getLibraryWindow(now);
  
  if (now.getTime() < todayOpen.getTime()) {
    return todayOpen;
  }
  
  if (now.getTime() >= todayClose.getTime()) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { open: tomorrowOpen } = getLibraryWindow(tomorrow);
    return tomorrowOpen;
  }
  
  const rounded = roundUpToInterval(now, SLOT_INTERVAL_MINUTES);
  if (rounded.getTime() > todayClose.getTime()) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { open: tomorrowOpen } = getLibraryWindow(tomorrow);
    return tomorrowOpen;
  }
  
  return clampStartToLibrary(rounded);
}

/**
 * Normalize start time to valid booking slot
 */
export function normalizeStartTime(candidate: Date): Date {
  let normalized = clampStartToLibrary(roundUpToInterval(candidate, SLOT_INTERVAL_MINUTES));
  const now = new Date();

  if (isSameCalendarDay(normalized, now) && normalized.getTime() < now.getTime()) {
    const next = clampStartToLibrary(roundUpToInterval(now, SLOT_INTERVAL_MINUTES));
    const { close } = getLibraryWindow(now);
    if (next.getTime() <= close.getTime()) {
      normalized = next;
    } else {
      normalized = clampStartToLibrary(getNextAvailableStart());
    }
  }

  return normalized;
}

/**
 * Normalize end time based on start time and constraints
 */
export function normalizeEndTime(start: Date, candidate?: Date | null): Date {
  const base = candidate ? new Date(candidate) : new Date(start.getTime() + BOOKING_MIN_DURATION_MS);
  let normalized = clampEndToLibrary(base, start);
  let diff = normalized.getTime() - start.getTime();

  if (diff < BOOKING_MIN_DURATION_MS) {
    normalized = clampEndToLibrary(new Date(start.getTime() + BOOKING_MIN_DURATION_MS), start);
    diff = normalized.getTime() - start.getTime();
  }

  if (diff > BOOKING_MAX_DURATION_MS) {
    normalized = clampEndToLibrary(new Date(start.getTime() + BOOKING_MAX_DURATION_MS), start);
  }

  return normalized;
}

/**
 * Check if a date/time is within library operating hours
 */
export function isWithinLibraryHours(date: Date): boolean {
  const { open, close } = getLibraryWindow(date);
  return date.getTime() >= open.getTime() && date.getTime() <= close.getTime();
}

/**
 * Format library hours as a readable string
 */
export function formatLibraryHours(): string {
  const sample = new Date();
  const { open, close } = getLibraryWindow(sample);
  const openLabel = format(open, "h:mm a");
  const closeLabel = format(close, "h:mm a");
  return `${openLabel} - ${closeLabel}`;
}

/**
 * Format date as readable string
 */
export function formatDate(date?: Date): string {
  return date ? format(date, "EEE, MMM d, yyyy") : "";
}

/**
 * Format time as readable string
 */
export function formatTime(date?: Date): string {
  return date ? format(date, "hh:mm a") : "";
}

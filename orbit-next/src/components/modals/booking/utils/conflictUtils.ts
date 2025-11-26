/**
 * conflictUtils.ts
 * 
 * Utilities for handling booking conflicts and server error payloads.
 */

import { format } from 'date-fns';
import type { ConflictEntry } from '../hooks/useSlotManagement';

// Re-export ConflictEntry type from hooks to avoid duplication
export type { ConflictEntry } from '../hooks/useSlotManagement';

export interface ConflictPayload {
  message?: string;
  conflictingBookings?: any[];
  conflictingHoldExpiresAt?: string;
}

/**
 * Build a detailed conflict description from server error payload
 */
export function buildConflictDescription(payload: any, baseMessage: string): string {
  try {
    if (!payload || typeof payload !== 'object') return baseMessage;
    
    const conflicts = payload.conflictingBookings;
    if (!Array.isArray(conflicts) || conflicts.length === 0) return baseMessage;
    
    const conflictDetails = conflicts.map((booking: any) => {
      const start = new Date(booking.startTime);
      const end = new Date(booking.endTime);
      return `${format(start, 'MMM d, h:mm a')} - ${format(end, 'h:mm a')}`;
    }).join(', ');
    
    return `${baseMessage} Conflicting time(s): ${conflictDetails}`;
  } catch {
    return baseMessage;
  }
}

/**
 * Extract conflict entries from error payload
 */
export function extractConflictEntries(payload: any, facilityName: string): ConflictEntry[] | null {
  if (!payload || !Array.isArray(payload.conflictingBookings)) {
    return null;
  }
  
  return payload.conflictingBookings.map((booking: any) => ({
    id: booking.id,
    startTime: booking.startTime,
    endTime: booking.endTime,
    facilityName,
    status: booking.status,
  }));
}

/**
 * Check if error indicates a time conflict
 */
export function isTimeConflictError(errorMessage: string): boolean {
  return errorMessage.includes('You already have a booking during this time') ||
         errorMessage.includes('You already have an active booking for this facility') ||
         errorMessage.includes('time slot is already booked');
}

/**
 * Check if error indicates capacity exceeded
 */
export function isCapacityError(errorMessage: string): boolean {
  return errorMessage.includes('exceeds facility capacity');
}

/**
 * Check if error indicates daily limit reached
 */
export function isDailyLimitError(errorMessage: string): boolean {
  return errorMessage.includes('daily booking limit') ||
         errorMessage.includes('You can only book');
}

/**
 * Format error message for user display
 */
export function formatErrorMessage(error: any): string {
  if (!error) return "An unexpected error occurred.";
  
  if (typeof error === 'string') return error;
  
  if (error.message) {
    return error.message
      .split('{"')[0]
      .replace(/ID:[^,\s]*/g, '')
      .trim();
  }
  
  return "An error occurred while processing your booking.";
}

/**
 * Extract hold expiration message from payload
 */
export function getHoldExpirationMessage(payload: any): string | null {
  if (!payload?.conflictingHoldExpiresAt) return null;
  
  const expiresAt = new Date(payload.conflictingHoldExpiresAt);
  if (Number.isNaN(expiresAt.getTime())) return null;
  
  return `Another user is currently holding this slot until ${format(expiresAt, "MMM d, yyyy h:mm a")}.`;
}

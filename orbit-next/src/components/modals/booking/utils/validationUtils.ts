/**
 * Booking Validation Utilities
 * 
 * Functions for validating booking forms and formatting error messages
 */

import { format } from 'date-fns';
import {
  BOOKING_MIN_DURATION_MS,
  BOOKING_MAX_DURATION_MS,
  BOOKING_MIN_DURATION_MINUTES,
  BOOKING_MAX_DURATION_MINUTES,
} from '@shared/bookingRules';
import { isWithinLibraryHours, formatLibraryHours } from './dateTimeUtils';

export interface ValidationError {
  title: string;
  description: string;
}

export interface BookingValidationData {
  startTime?: Date;
  endTime?: Date;
  facilityId?: string;
  purpose?: string;
  participants?: number;
}

/**
 * Validate booking form data in real-time
 */
export function validateBookingForm(
  data: BookingValidationData,
  facilities: any[],
  userEmail?: string
): ValidationError[] {
  const validationErrors: ValidationError[] = [];

  // Only validate if we have the necessary data
  if (!data.startTime || !data.endTime || !data.facilityId) {
    return validationErrors;
  }

  // Validate start time is not in the past
  const currentTime = new Date();
  if (data.startTime.getTime() < currentTime.getTime()) {
    validationErrors.push({
      title: 'Invalid Start Time',
      description: 'Start time cannot be in the past. Please select a future time.',
    });
  }

  // Validate facility exists
  if (typeof data.facilityId !== 'string') {
    return validationErrors;
  }

  const facility = facilities.find((f) => f.id === parseInt(data.facilityId!, 10));
  if (!facility) {
    validationErrors.push({
      title: 'Invalid Facility',
      description: 'The selected facility is not available. Please choose another facility.',
    });
  } else if (!facility.isActive) {
    validationErrors.push({
      title: 'Facility Unavailable',
      description: `${facility.name} is currently unavailable. Please select a different facility.`,
    });
  }

  // Validate end time is after start time
  if (data.endTime <= data.startTime) {
    validationErrors.push({
      title: 'Invalid Time Selection',
      description: 'Invalid time selection. The start time must be earlier than the end time.',
    });
  }

  // Validate same calendar day (no multi-day bookings)
  const sDate = data.startTime;
  const eDate = data.endTime;
  if (
    sDate.getFullYear() !== eDate.getFullYear() ||
    sDate.getMonth() !== eDate.getMonth() ||
    sDate.getDate() !== eDate.getDate()
  ) {
    validationErrors.push({
      title: 'Single-Day Booking Required',
      description: 'Bookings must start and end on the same calendar day. Please split multi-day events into separate bookings.',
    });
  }

  // Validate library hours for both start and end time
  const startTimeValid = isWithinLibraryHours(data.startTime);
  const endTimeValid = isWithinLibraryHours(data.endTime);

  if (!startTimeValid || !endTimeValid) {
    const timeIssues: string[] = [];
    if (!startTimeValid) timeIssues.push('start time');
    if (!endTimeValid) timeIssues.push('end time');
    validationErrors.push({
      title: 'Outside School Hours',
      description: `Your ${timeIssues.join(' and ')} ${timeIssues.length > 1 ? 'are' : 'is'} outside school operating hours (${formatLibraryHours()}). Room access is only available during these hours.`,
    });
  }

  // Facility-specific duration validation
  if (facility && data.startTime && data.endTime) {
    const diff = data.endTime.getTime() - data.startTime.getTime();
    const durationMinutes = diff / (1000 * 60);
    const durationHours = diff / (1000 * 60 * 60);

    // Minimum duration check
    if (diff > 0 && diff < BOOKING_MIN_DURATION_MS) {
      validationErrors.push({
        title: 'Booking Too Short',
        description: `Bookings must be at least ${BOOKING_MIN_DURATION_MINUTES} minutes long. Your current booking is ${Math.floor(durationMinutes)} minutes.`,
      });
    }

    const facilityName = facility.name.toLowerCase();
    const isCollabRoom =
      facilityName.includes('collaborative learning room 1') ||
      facilityName.includes('collaborative learning room 2');

    if (isCollabRoom && durationHours > 2) {
      validationErrors.push({
        title: 'Duration Limit Exceeded',
        description: `Collaborative Learning Rooms can only be booked for a maximum of 2 hours. Your current booking is ${durationHours.toFixed(1)} hours. Please reduce your booking duration.`,
      });
    } else if (!isCollabRoom && diff > BOOKING_MAX_DURATION_MS) {
      validationErrors.push({
        title: 'Maximum Duration Exceeded',
        description: `Bookings cannot exceed ${BOOKING_MAX_DURATION_MINUTES} minutes (${BOOKING_MAX_DURATION_MINUTES / 60} hours). Your current booking is ${Math.floor(durationMinutes)} minutes.`,
      });
    }

    // Capacity validation
    if (data.participants && data.participants > (facility.capacity || 8)) {
      validationErrors.push({
        title: 'Capacity Exceeded',
        description: `The selected room has a maximum capacity of ${facility.capacity || 8} people. Please reduce the number of participants to ${facility.capacity || 8} or fewer.`,
      });
    }
  }

  // Validate purpose field
  if (data.purpose !== undefined && data.purpose.trim().length === 0) {
    validationErrors.push({
      title: 'Purpose Required',
      description: 'Please provide a purpose for your booking.',
    });
  }

  return validationErrors;
}

/**
 * Format booking conflict error messages
 */
export function formatBookingConflictMessage(errorMessage: string): string {
  try {
    // Extract readable part before JSON
    const readablePart = errorMessage.split('. Existing booking:')[0];

    // Try to extract datetime info
    if (errorMessage.includes('Existing booking:') && errorMessage.includes('/')) {
      const dateTimeMatch = errorMessage.match(/(\d{1,2}\/\d{1,2}\/\d{4}[^"]*)/);
      if (dateTimeMatch) {
        return `${readablePart}. Your existing booking: ${dateTimeMatch[1]}`;
      }
    }

    // Clean up message
    const cleanMessage = readablePart
      .replace(/\s*\{\".*$/g, '')
      .replace(/\s*Please cancel your existing booking first.*$/g, '')
      .trim();

    return `${cleanMessage}. Please cancel your existing booking first or choose a different time.`;
  } catch (error) {
    return errorMessage
      .split('{"')[0]
      .replace(/ID:[^,\s]*/g, '')
      .trim();
  }
}

/**
 * Calculate booking duration
 */
export function calculateDuration(start?: Date, end?: Date): string {
  if (!start || !end) return '';
  const diff = end.getTime() - start.getTime();
  if (diff <= 0) return '';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

/**
 * Check if booking duration is valid
 */
export function isDurationValid(start?: Date, end?: Date): boolean {
  if (!start || !end) return false;
  const diff = end.getTime() - start.getTime();
  return diff >= BOOKING_MIN_DURATION_MS && diff <= BOOKING_MAX_DURATION_MS;
}

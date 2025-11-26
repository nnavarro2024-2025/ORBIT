/**
 * Facility Utility Functions
 * 
 * Helper functions for facility descriptions and lookups
 */

import type { EquipmentStateValue } from '../schemas/bookingSchema';

/**
 * Derive equipment data for booking submission
 */
export function deriveEquipmentForSubmission(
  equipmentState: Record<string, EquipmentStateValue>,
  equipmentOtherText: string
): { items: string[]; others: string } {
  const selectedItems = Object.keys(equipmentState).filter(
    (key) => equipmentState[key] === 'prepared' || (equipmentState[key] !== false && equipmentState[key] !== 'not_available')
  );

  return {
    items: selectedItems,
    others: equipmentOtherText.trim(),
  };
}

/**
 * Preview limit for displaying lists in modals
 */
export const PREVIEW_LIMIT = 10;

/**
 * Get maximum capacity for a facility with fallback
 */
export function getFacilityMaxCapacity(facility?: { capacity?: number } | null): number {
  if (!facility) return 8; // Default fallback
  const capacity = facility.capacity;
  return (typeof capacity === 'number' && capacity > 0) ? capacity : 8;
}

/**
 * Get current status of a facility
 */
export function getFacilityCurrentStatus(
  facilityId: number,
  allBookings: any[]
): {
  type: 'active' | 'upcoming';
  message: string;
  booking?: any;
  bookings?: any[];
} | null {
  const now = new Date();
  
  // Check for both pending and approved bookings to show accurate facility status
  const blockingStatuses = ["approved", "pending"];
  const facilityBookings = allBookings.filter((booking: any) => 
    booking.facilityId === facilityId && 
    blockingStatuses.includes(booking.status) &&
    new Date(booking.endTime) > now
  ).sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (facilityBookings.length === 0) return null;

  // Check for currently active booking (only approved bookings can be "active")
  const activeBooking = facilityBookings.find((booking: any) => {
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    return booking.status === "approved" && now >= start && now <= end;
  });

  if (activeBooking) {
    return {
      type: "active",
      message: `Currently in use until ${new Date(activeBooking.endTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })}`,
      booking: activeBooking
    };
  }

  // Check for upcoming bookings (both pending and approved)
  const upcomingBookings = facilityBookings.filter((booking: any) => 
    blockingStatuses.includes(booking.status) && new Date(booking.startTime) > now
  );

  if (upcomingBookings.length > 0) {
    return {
      type: "upcoming",
      message: `${upcomingBookings.length} upcoming booking${upcomingBookings.length > 1 ? 's' : ''}`,
      bookings: upcomingBookings
    };
  }

  return null;
}


// Pagination constants
export const ITEMS_PER_PAGE = 5; // My Bookings preview
export const NOTIFICATIONS_PER_PAGE = 10; // Activity Logs notifications
export const BOOKINGS_PER_PAGE = 10; // Activity Logs booking history

// Library hours constants (in minutes from midnight)
export const LIBRARY_OPEN_TIME = 7 * 60 + 30; // 7:30 AM
export const LIBRARY_CLOSE_TIME = 19 * 60; // 7:00 PM

// Booking time defaults
export const DEFAULT_BOOKING_LEAD_TIME = 60 * 60 * 1000 + 60 * 1000; // 1 hour + 1 minute buffer
export const DEFAULT_BOOKING_DURATION = 30 * 60 * 1000; // 30 minutes

// Slot configuration
export const SLOT_DURATION_MINUTES = 30;
export const DAILY_START_HOUR = 7.5; // 7:30 AM
export const DAILY_END_HOUR = 19; // 7:00 PM

// Scroll and highlight timings
export const SCROLL_HIGHLIGHT_DURATION = 2200; // milliseconds
export const SCROLL_RESET_DELAY = 2500; // milliseconds

// API stale time
export const AVAILABILITY_STALE_TIME = 30_000; // 30 seconds
export const NOTIFICATIONS_STALE_TIME = 30_000; // 30 seconds

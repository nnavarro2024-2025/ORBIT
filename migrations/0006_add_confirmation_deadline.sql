-- Add confirmation_deadline column for pending booking confirmation window
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS confirmation_deadline TIMESTAMP;

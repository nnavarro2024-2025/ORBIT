-- Add arrival_confirmation_deadline and arrival_confirmed columns for arrival confirmation window
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS arrival_confirmation_deadline TIMESTAMP;
ALTER TABLE facility_bookings ADD COLUMN IF NOT EXISTS arrival_confirmed BOOLEAN DEFAULT false;

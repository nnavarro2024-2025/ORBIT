-- Add equipment JSONB column to facility_bookings
ALTER TABLE facility_bookings
  ADD COLUMN IF NOT EXISTS equipment JSONB;

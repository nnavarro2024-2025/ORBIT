-- Fix JSONB columns that contain the string "undefined" instead of NULL
-- This script cleans up invalid equipment data in facility_bookings table

BEGIN;

-- Update rows where equipment is the string "undefined" to NULL
UPDATE facility_bookings 
SET equipment = NULL 
WHERE equipment::text = '"undefined"';

-- Update rows where equipment is empty string
UPDATE facility_bookings 
SET equipment = NULL 
WHERE equipment::text = '""';

-- Update rows where equipment is the string "null"
UPDATE facility_bookings 
SET equipment = NULL 
WHERE equipment::text = '"null"';

-- Show count of affected rows
SELECT COUNT(*) as cleaned_rows 
FROM facility_bookings 
WHERE equipment IS NULL;

COMMIT;

-- Add unavailable_reason to facilities
ALTER TABLE facilities
ADD COLUMN IF NOT EXISTS unavailable_reason TEXT;

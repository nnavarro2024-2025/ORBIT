-- Migration: Add updated_at column to system_alerts table
-- This column is used for tracking when alerts are updated (e.g., during deduplication)
-- and for ordering alerts by most recent activity

-- Add the updated_at column with a default value
ALTER TABLE system_alerts 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;

-- Set updated_at to created_at for existing records
UPDATE system_alerts 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Create an index on updated_at for better query performance
CREATE INDEX IF NOT EXISTS idx_system_alerts_updated_at ON system_alerts(updated_at DESC);

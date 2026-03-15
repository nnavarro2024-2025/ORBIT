-- Safe migration to add password support to users table
-- Run this in Supabase SQL Editor

-- Add password_hash column if it doesn't exist
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS password_hash varchar;

-- Add password_setup_required_at column if it doesn't exist
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS password_setup_required_at timestamp;

-- Verify the columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('password_hash', 'password_setup_required_at')
ORDER BY ordinal_position;

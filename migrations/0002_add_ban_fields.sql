-- Add ban-related fields to users table
ALTER TABLE users 
ADD COLUMN ban_reason TEXT,
ADD COLUMN ban_end_date TIMESTAMP,
ADD COLUMN banned_at TIMESTAMP;

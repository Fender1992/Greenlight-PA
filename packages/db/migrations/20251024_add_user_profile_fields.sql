-- Add user profile fields to member table
-- Migration: 20251024_add_user_profile_fields
-- Description: Add first_name, last_name, phone_number, and address fields to member table

ALTER TABLE member
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add comment to document these fields
COMMENT ON COLUMN member.first_name IS 'User first name';
COMMENT ON COLUMN member.last_name IS 'User last name';
COMMENT ON COLUMN member.phone_number IS 'User phone number';
COMMENT ON COLUMN member.address IS 'User address';

-- ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
-- Migration: Add Member Profile Fields | Created: 2025-10-24

-- ============================================================================
-- ADD PROFILE FIELDS TO MEMBER TABLE
-- ============================================================================

-- Add profile fields to member table
ALTER TABLE member
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add index for name searches
CREATE INDEX IF NOT EXISTS idx_member_names ON member(first_name, last_name);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN member.first_name IS 'User first name for profile display';
COMMENT ON COLUMN member.last_name IS 'User last name for profile display';
COMMENT ON COLUMN member.phone_number IS 'User contact phone number';
COMMENT ON COLUMN member.address IS 'User mailing/contact address';

-- ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
-- Migration: Backfill has_seen_tour for existing members | Created: 2025-10-20

-- Set has_seen_tour = TRUE for all existing members
-- This prevents current users from seeing the tour unexpectedly
-- New users will get FALSE by default from the column default

UPDATE member
SET has_seen_tour = TRUE
WHERE has_seen_tour IS NULL OR has_seen_tour = FALSE;

-- Add comment documenting the backfill
COMMENT ON COLUMN member.has_seen_tour IS 'Tracks whether user has completed the onboarding product tour. Backfilled to TRUE for existing users on 2025-10-20';

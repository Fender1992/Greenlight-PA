-- ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
-- Migration: Add has_seen_tour flag to member table | Created: 2025-10-20

-- Add has_seen_tour column to member table
ALTER TABLE member
  ADD COLUMN has_seen_tour BOOLEAN DEFAULT FALSE;

-- Add index for efficient queries
CREATE INDEX idx_member_has_seen_tour ON member(has_seen_tour) WHERE has_seen_tour = FALSE;

-- Add comment
COMMENT ON COLUMN member.has_seen_tour IS 'Tracks whether user has completed the onboarding product tour';

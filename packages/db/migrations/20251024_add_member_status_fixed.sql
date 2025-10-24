/**
 * Migration: Add status field to member table for approval workflow (FIXED)
 * Date: 2025-10-24
 *
 * Changes:
 * - Add status column to member table (pending, active, rejected)
 * - Set existing members to 'active' status
 * - Update RLS policies to require active status
 * - Add index on status for performance
 * - Drop and recreate helper functions with updated logic
 */

-- Add status column to member table
ALTER TABLE member
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
CHECK (status IN ('pending', 'active', 'rejected'));

-- Set all existing members to active status
UPDATE member SET status = 'active';

-- Add indexes for performance
CREATE INDEX idx_member_status ON member(status);
CREATE INDEX idx_member_org_status ON member(org_id, status);

-- ============================================================================
-- Update Helper Functions to Check Active Status
-- ============================================================================

-- Drop existing functions first to avoid signature conflicts
DROP FUNCTION IF EXISTS get_user_org_ids(UUID);
DROP FUNCTION IF EXISTS is_org_admin(UUID, UUID);

-- Recreate get_user_org_ids with active status check
CREATE FUNCTION get_user_org_ids(user_uuid UUID)
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(org_id)
  FROM member
  WHERE user_id = user_uuid
    AND status = 'active';
$$ LANGUAGE SQL SECURITY DEFINER;

-- Recreate is_org_admin with active status check
CREATE FUNCTION is_org_admin(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM member
    WHERE user_id = user_uuid
      AND org_id = org_uuid
      AND role = 'admin'
      AND status = 'active'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Add helper function to get user's active membership
CREATE OR REPLACE FUNCTION get_active_membership(user_uuid UUID, org_uuid UUID)
RETURNS TABLE (
  id UUID,
  role TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
) AS $$
  SELECT id, role, status, created_at
  FROM member
  WHERE user_id = user_uuid
    AND org_id = org_uuid
    AND status = 'active'
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================================
-- Update RLS Policies to Enforce Active Status
-- ============================================================================

-- Drop existing member policies
DROP POLICY IF EXISTS "member_select_policy" ON member;
DROP POLICY IF EXISTS "member_policy" ON member;
DROP POLICY IF EXISTS "member_insert_policy" ON member;
DROP POLICY IF EXISTS "member_update_policy" ON member;
DROP POLICY IF EXISTS "member_delete_policy" ON member;

-- Member: Users can view active members of their organizations
CREATE POLICY "member_select_policy" ON member
  FOR SELECT
  USING (
    org_id = ANY(get_user_org_ids(auth.uid()))
  );

-- Member: Allow self-registration with pending status OR admins can create members
CREATE POLICY "member_insert_policy" ON member
  FOR INSERT
  WITH CHECK (
    -- Allow self-registration with pending status
    user_id = auth.uid() AND status = 'pending'
    OR
    -- Allow admins to create members
    EXISTS (
      SELECT 1 FROM member m
      WHERE m.user_id = auth.uid()
        AND m.org_id = member.org_id
        AND m.role = 'admin'
        AND m.status = 'active'
    )
  );

-- Member: Only active admins can update members
CREATE POLICY "member_update_policy" ON member
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM member m
      WHERE m.user_id = auth.uid()
        AND m.org_id = member.org_id
        AND m.role = 'admin'
        AND m.status = 'active'
    )
  );

-- Member: Only active admins can delete members
CREATE POLICY "member_delete_policy" ON member
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM member m
      WHERE m.user_id = auth.uid()
        AND m.org_id = member.org_id
        AND m.role = 'admin'
        AND m.status = 'active'
    )
  );

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN member.status IS 'Membership status: pending (awaiting approval), active (approved), rejected (denied by admin)';
COMMENT ON INDEX idx_member_status IS 'Index for filtering members by approval status';
COMMENT ON INDEX idx_member_org_status IS 'Composite index for org-scoped status queries';

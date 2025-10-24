-- ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
-- Migration: Add Super Admin Support | Created: 2025-10-24

-- ============================================================================
-- SUPER ADMIN TABLE
-- ============================================================================

-- Create super_admin table for platform-level administrators
-- Super admins have access to all organizations and can perform platform-wide operations
CREATE TABLE IF NOT EXISTS super_admin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE, -- References auth.users in Supabase
  granted_by UUID, -- Who granted super admin access (can be NULL for initial setup)
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT -- Optional notes about why this user is a super admin
);

CREATE INDEX idx_super_admin_user_id ON super_admin(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY FOR SUPER_ADMIN TABLE
-- ============================================================================

-- Enable RLS on super_admin table
ALTER TABLE super_admin ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can SELECT super_admin records
-- This prevents authenticated users from querying the table directly
CREATE POLICY super_admin_select_policy ON super_admin
  FOR SELECT
  USING (
    -- Only service_role can read
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Policy: Only service role or existing super admins can INSERT
-- This prevents users from self-promoting to super admin
CREATE POLICY super_admin_insert_policy ON super_admin
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Existing super admin can grant access
    EXISTS (
      SELECT 1 FROM super_admin
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Only service role or existing super admins can DELETE
CREATE POLICY super_admin_delete_policy ON super_admin
  FOR DELETE
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Existing super admin can revoke access
    EXISTS (
      SELECT 1 FROM super_admin
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Only service role can UPDATE
-- We generally don't update super_admin records, but lock it down
CREATE POLICY super_admin_update_policy ON super_admin
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- ============================================================================
-- UPDATE MEMBER TABLE ROLE CONSTRAINT
-- ============================================================================

-- Drop the existing role check constraint
ALTER TABLE member DROP CONSTRAINT IF EXISTS member_role_check;

-- Add new constraint that includes super_admin
ALTER TABLE member
  ADD CONSTRAINT member_role_check
  CHECK (role IN ('admin', 'staff', 'referrer', 'super_admin'));

-- ============================================================================
-- HELPER FUNCTIONS FOR SUPER ADMIN
-- ============================================================================

-- Function to check if a user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM super_admin
    WHERE user_id = user_uuid
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Update get_user_org_ids to include ALL orgs for super admins
CREATE OR REPLACE FUNCTION get_user_org_ids(user_uuid UUID)
RETURNS UUID[] AS $$
BEGIN
  -- If user is super admin, return all org IDs
  IF is_super_admin(user_uuid) THEN
    RETURN ARRAY(SELECT id FROM org);
  END IF;

  -- Otherwise, return only their active memberships
  RETURN ARRAY(
    SELECT org_id
    FROM member
    WHERE user_id = user_uuid
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update is_org_admin to return true for super admins
CREATE OR REPLACE FUNCTION is_org_admin(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super admins have admin access to all orgs
  IF is_super_admin(user_uuid) THEN
    RETURN TRUE;
  END IF;

  -- Otherwise check for active admin membership
  RETURN EXISTS (
    SELECT 1 FROM member
    WHERE user_id = user_uuid
      AND org_id = org_uuid
      AND role = 'admin'
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE super_admin IS 'Platform-level administrators with access to all organizations';
COMMENT ON COLUMN super_admin.user_id IS 'Reference to auth.users - the user who is a super admin';
COMMENT ON COLUMN super_admin.granted_by IS 'The user_id of who granted super admin access';
COMMENT ON FUNCTION is_super_admin IS 'Returns true if the user is a super admin';
COMMENT ON FUNCTION get_user_org_ids IS 'Returns all org IDs for super admins, or active memberships for regular users';
COMMENT ON FUNCTION is_org_admin IS 'Returns true if user is super admin or active admin in the org';

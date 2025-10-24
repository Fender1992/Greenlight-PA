-- ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
-- Migration: Add RLS to Super Admin Table | Created: 2025-10-24

-- ============================================================================
-- ROW LEVEL SECURITY FOR SUPER_ADMIN TABLE
-- ============================================================================

-- Enable RLS on super_admin table
ALTER TABLE super_admin ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS super_admin_select_policy ON super_admin;
DROP POLICY IF EXISTS super_admin_insert_policy ON super_admin;
DROP POLICY IF EXISTS super_admin_delete_policy ON super_admin;
DROP POLICY IF EXISTS super_admin_update_policy ON super_admin;

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

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'super_admin'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on super_admin table';
  END IF;
  RAISE NOTICE 'RLS successfully enabled on super_admin table';
END $$;

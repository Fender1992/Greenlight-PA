/**
 * Migration: Add status field to member table for approval workflow (WITH CASCADE)
 * Date: 2025-10-24
 *
 * This migration handles dropping and recreating functions with CASCADE
 * to handle all dependent RLS policies
 */

-- ============================================================================
-- STEP 1: Add status column
-- ============================================================================

ALTER TABLE member
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
CHECK (status IN ('pending', 'active', 'rejected'));

-- Set all existing members to active status
UPDATE member SET status = 'active';

-- Add indexes for performance
CREATE INDEX idx_member_status ON member(status);
CREATE INDEX idx_member_org_status ON member(org_id, status);

-- ============================================================================
-- STEP 2: Drop existing functions with CASCADE (drops all dependent policies)
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_org_ids(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_org_admin(UUID, UUID) CASCADE;

-- ============================================================================
-- STEP 3: Recreate helper functions with active status check
-- ============================================================================

CREATE FUNCTION get_user_org_ids(user_uuid UUID)
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(org_id)
  FROM member
  WHERE user_id = user_uuid
    AND status = 'active';
$$ LANGUAGE SQL SECURITY DEFINER;

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
-- STEP 4: Recreate all RLS policies that were dropped by CASCADE
-- ============================================================================

-- ORG table policies
CREATE POLICY "Users can view their own orgs" ON org
  FOR SELECT
  USING (id = ANY(get_user_org_ids(auth.uid())));

-- MEMBER table policies
CREATE POLICY "member_select_policy" ON member
  FOR SELECT
  USING (org_id = ANY(get_user_org_ids(auth.uid())));

CREATE POLICY "member_insert_policy" ON member
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND status = 'pending'
    OR
    EXISTS (
      SELECT 1 FROM member m
      WHERE m.user_id = auth.uid()
        AND m.org_id = member.org_id
        AND m.role = 'admin'
        AND m.status = 'active'
    )
  );

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

-- PATIENT table policies
CREATE POLICY "Users can view patients in their org" ON patient
  FOR SELECT
  USING (org_id = ANY(get_user_org_ids(auth.uid())));

CREATE POLICY "Users can insert patients in their org" ON patient
  FOR INSERT
  WITH CHECK (org_id = ANY(get_user_org_ids(auth.uid())));

CREATE POLICY "Users can update patients in their org" ON patient
  FOR UPDATE
  USING (org_id = ANY(get_user_org_ids(auth.uid())));

CREATE POLICY "Users can delete patients in their org" ON patient
  FOR DELETE
  USING (org_id = ANY(get_user_org_ids(auth.uid())));

-- COVERAGE table policies
CREATE POLICY "Users can view coverage in their org" ON coverage
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patient
      WHERE patient.id = coverage.patient_id
        AND patient.org_id = ANY(get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can insert coverage in their org" ON coverage
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patient
      WHERE patient.id = coverage.patient_id
        AND patient.org_id = ANY(get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can update coverage in their org" ON coverage
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM patient
      WHERE patient.id = coverage.patient_id
        AND patient.org_id = ANY(get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can delete coverage in their org" ON coverage
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM patient
      WHERE patient.id = coverage.patient_id
        AND patient.org_id = ANY(get_user_org_ids(auth.uid()))
    )
  );

-- PROVIDER table policies
CREATE POLICY "Users can view providers in their org" ON provider
  FOR SELECT
  USING (org_id = ANY(get_user_org_ids(auth.uid())));

CREATE POLICY "Users can insert providers in their org" ON provider
  FOR INSERT
  WITH CHECK (org_id = ANY(get_user_org_ids(auth.uid())));

CREATE POLICY "Users can update providers in their org" ON provider
  FOR UPDATE
  USING (org_id = ANY(get_user_org_ids(auth.uid())));

CREATE POLICY "Users can delete providers in their org" ON provider
  FOR DELETE
  USING (org_id = ANY(get_user_org_ids(auth.uid())));

-- ORDER table policies
CREATE POLICY "Users can view orders in their org" ON "order"
  FOR SELECT
  USING (org_id = ANY(get_user_org_ids(auth.uid())));

CREATE POLICY "Users can insert orders in their org" ON "order"
  FOR INSERT
  WITH CHECK (org_id = ANY(get_user_org_ids(auth.uid())));

CREATE POLICY "Users can update orders in their org" ON "order"
  FOR UPDATE
  USING (org_id = ANY(get_user_org_ids(auth.uid())));

CREATE POLICY "Users can delete orders in their org" ON "order"
  FOR DELETE
  USING (org_id = ANY(get_user_org_ids(auth.uid())));

-- PA_REQUEST table policies
CREATE POLICY "Users can view PA requests in their org" ON pa_request
  FOR SELECT
  USING (org_id = ANY(get_user_org_ids(auth.uid())));

CREATE POLICY "Users can insert PA requests in their org" ON pa_request
  FOR INSERT
  WITH CHECK (org_id = ANY(get_user_org_ids(auth.uid())));

CREATE POLICY "Users can update PA requests in their org" ON pa_request
  FOR UPDATE
  USING (org_id = ANY(get_user_org_ids(auth.uid())));

CREATE POLICY "Users can delete PA requests in their org" ON pa_request
  FOR DELETE
  USING (org_id = ANY(get_user_org_ids(auth.uid())));

-- PA_CHECKLIST_ITEM table policies
CREATE POLICY "Users can view checklist items for their org PAs" ON pa_checklist_item
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pa_request
      WHERE pa_request.id = pa_checklist_item.pa_request_id
        AND pa_request.org_id = ANY(get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can insert checklist items for their org PAs" ON pa_checklist_item
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pa_request
      WHERE pa_request.id = pa_checklist_item.pa_request_id
        AND pa_request.org_id = ANY(get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can update checklist items for their org PAs" ON pa_checklist_item
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pa_request
      WHERE pa_request.id = pa_checklist_item.pa_request_id
        AND pa_request.org_id = ANY(get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can delete checklist items for their org PAs" ON pa_checklist_item
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pa_request
      WHERE pa_request.id = pa_checklist_item.pa_request_id
        AND pa_request.org_id = ANY(get_user_org_ids(auth.uid()))
    )
  );

-- PA_SUMMARY table policies
CREATE POLICY "Users can view summaries for their org PAs" ON pa_summary
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pa_request
      WHERE pa_request.id = pa_summary.pa_request_id
        AND pa_request.org_id = ANY(get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can insert summaries for their org PAs" ON pa_summary
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pa_request
      WHERE pa_request.id = pa_summary.pa_request_id
        AND pa_request.org_id = ANY(get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can update summaries for their org PAs" ON pa_summary
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pa_request
      WHERE pa_request.id = pa_summary.pa_request_id
        AND pa_request.org_id = ANY(get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can delete summaries for their org PAs" ON pa_summary
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pa_request
      WHERE pa_request.id = pa_summary.pa_request_id
        AND pa_request.org_id = ANY(get_user_org_ids(auth.uid()))
    )
  );

-- ATTACHMENT table policies
CREATE POLICY "Users can view attachments in their org" ON attachment
  FOR SELECT
  USING (org_id = ANY(get_user_org_ids(auth.uid())));

CREATE POLICY "Users can insert attachments in their org" ON attachment
  FOR INSERT
  WITH CHECK (org_id = ANY(get_user_org_ids(auth.uid())));

CREATE POLICY "Users can update attachments in their org" ON attachment
  FOR UPDATE
  USING (org_id = ANY(get_user_org_ids(auth.uid())));

CREATE POLICY "Users can delete attachments in their org" ON attachment
  FOR DELETE
  USING (org_id = ANY(get_user_org_ids(auth.uid())));

-- STATUS_EVENT table policies
CREATE POLICY "Users can view status events for their org PAs" ON status_event
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pa_request
      WHERE pa_request.id = status_event.pa_request_id
        AND pa_request.org_id = ANY(get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can insert status events for their org PAs" ON status_event
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pa_request
      WHERE pa_request.id = status_event.pa_request_id
        AND pa_request.org_id = ANY(get_user_org_ids(auth.uid()))
    )
  );

-- AUDIT_LOG table policies
CREATE POLICY "Users can view audit logs for their org" ON audit_log
  FOR SELECT
  USING (org_id = ANY(get_user_org_ids(auth.uid())));

-- ============================================================================
-- STEP 5: Add documentation comments
-- ============================================================================

COMMENT ON COLUMN member.status IS 'Membership status: pending (awaiting approval), active (approved), rejected (denied by admin)';
COMMENT ON INDEX idx_member_status IS 'Index for filtering members by approval status';
COMMENT ON INDEX idx_member_org_status IS 'Composite index for org-scoped status queries';

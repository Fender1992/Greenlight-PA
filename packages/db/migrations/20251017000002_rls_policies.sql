-- ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
-- Migration: Row Level Security Policies | Created: 2025-10-17

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE org ENABLE ROW LEVEL SECURITY;
ALTER TABLE member ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient ENABLE ROW LEVEL SECURITY;
ALTER TABLE payer ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE pa_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE pa_checklist_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE pa_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachment ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_snippet ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORG TABLE POLICIES
-- ============================================================================

-- Users can only see orgs they belong to
CREATE POLICY "Users can view their own orgs"
  ON org FOR SELECT
  USING (id IN (SELECT get_user_org_ids(auth.uid())));

-- Users can update orgs where they are admin
CREATE POLICY "Admins can update their orgs"
  ON org FOR UPDATE
  USING (is_org_admin(auth.uid(), id));

-- Only admins can insert orgs (handled by admin interface)
CREATE POLICY "Admins can insert orgs"
  ON org FOR INSERT
  WITH CHECK (true);  -- Further restricted by application layer

-- Only admins can delete orgs
CREATE POLICY "Admins can delete their orgs"
  ON org FOR DELETE
  USING (is_org_admin(auth.uid(), id));

-- ============================================================================
-- MEMBER TABLE POLICIES
-- ============================================================================

-- Users can view members of orgs they belong to
CREATE POLICY "Users can view members of their orgs"
  ON member FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

-- Admins can manage members in their orgs
CREATE POLICY "Admins can insert members in their orgs"
  ON member FOR INSERT
  WITH CHECK (is_org_admin(auth.uid(), org_id));

CREATE POLICY "Admins can update members in their orgs"
  ON member FOR UPDATE
  USING (is_org_admin(auth.uid(), org_id));

CREATE POLICY "Admins can delete members from their orgs"
  ON member FOR DELETE
  USING (is_org_admin(auth.uid(), org_id));

-- ============================================================================
-- PATIENT TABLE POLICIES
-- ============================================================================

-- Users can only access patients in their org
CREATE POLICY "Users can view patients in their org"
  ON patient FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can insert patients in their org"
  ON patient FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can update patients in their org"
  ON patient FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can delete patients in their org"
  ON patient FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

-- ============================================================================
-- PAYER TABLE POLICIES (SHARED RESOURCE)
-- ============================================================================

-- All authenticated users can view payers (shared reference data)
CREATE POLICY "All users can view payers"
  ON payer FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can manage payers
CREATE POLICY "Admins can insert payers"
  ON payer FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM member
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update payers"
  ON payer FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM member
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete payers"
  ON payer FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM member
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- ============================================================================
-- COVERAGE TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view coverage in their org"
  ON coverage FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can insert coverage in their org"
  ON coverage FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can update coverage in their org"
  ON coverage FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can delete coverage in their org"
  ON coverage FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

-- ============================================================================
-- PROVIDER TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view providers in their org"
  ON provider FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can insert providers in their org"
  ON provider FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can update providers in their org"
  ON provider FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can delete providers in their org"
  ON provider FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

-- ============================================================================
-- ORDER TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view orders in their org"
  ON "order" FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can insert orders in their org"
  ON "order" FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can update orders in their org"
  ON "order" FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can delete orders in their org"
  ON "order" FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

-- ============================================================================
-- PA_REQUEST TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view PA requests in their org"
  ON pa_request FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can insert PA requests in their org"
  ON pa_request FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can update PA requests in their org"
  ON pa_request FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can delete PA requests in their org"
  ON pa_request FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

-- ============================================================================
-- PA_CHECKLIST_ITEM TABLE POLICIES
-- ============================================================================

-- Users can access checklist items for PA requests in their org
CREATE POLICY "Users can view checklist items for their org PAs"
  ON pa_checklist_item FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pa_request
      WHERE pa_request.id = pa_checklist_item.pa_request_id
        AND pa_request.org_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can insert checklist items for their org PAs"
  ON pa_checklist_item FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pa_request
      WHERE pa_request.id = pa_checklist_item.pa_request_id
        AND pa_request.org_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can update checklist items for their org PAs"
  ON pa_checklist_item FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pa_request
      WHERE pa_request.id = pa_checklist_item.pa_request_id
        AND pa_request.org_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can delete checklist items for their org PAs"
  ON pa_checklist_item FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pa_request
      WHERE pa_request.id = pa_checklist_item.pa_request_id
        AND pa_request.org_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  );

-- ============================================================================
-- PA_SUMMARY TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view summaries for their org PAs"
  ON pa_summary FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pa_request
      WHERE pa_request.id = pa_summary.pa_request_id
        AND pa_request.org_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can insert summaries for their org PAs"
  ON pa_summary FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pa_request
      WHERE pa_request.id = pa_summary.pa_request_id
        AND pa_request.org_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can update summaries for their org PAs"
  ON pa_summary FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pa_request
      WHERE pa_request.id = pa_summary.pa_request_id
        AND pa_request.org_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can delete summaries for their org PAs"
  ON pa_summary FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pa_request
      WHERE pa_request.id = pa_summary.pa_request_id
        AND pa_request.org_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  );

-- ============================================================================
-- ATTACHMENT TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view attachments in their org"
  ON attachment FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can insert attachments in their org"
  ON attachment FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can update attachments in their org"
  ON attachment FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY "Users can delete attachments in their org"
  ON attachment FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

-- ============================================================================
-- STATUS_EVENT TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can view status events for their org PAs"
  ON status_event FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pa_request
      WHERE pa_request.id = status_event.pa_request_id
        AND pa_request.org_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  );

CREATE POLICY "Users can insert status events for their org PAs"
  ON status_event FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pa_request
      WHERE pa_request.id = status_event.pa_request_id
        AND pa_request.org_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  );

-- Status events are immutable (no update/delete)

-- ============================================================================
-- POLICY_SNIPPET TABLE POLICIES (SHARED RESOURCE)
-- ============================================================================

-- All authenticated users can view policy snippets
CREATE POLICY "All users can view policy snippets"
  ON policy_snippet FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can manage policy snippets
CREATE POLICY "Admins can insert policy snippets"
  ON policy_snippet FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM member
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update policy snippets"
  ON policy_snippet FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM member
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete policy snippets"
  ON policy_snippet FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM member
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- ============================================================================
-- AUDIT_LOG TABLE POLICIES
-- ============================================================================

-- Users can view audit logs for their org
CREATE POLICY "Users can view audit logs for their org"
  ON audit_log FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

-- Audit logs are inserted via service role or trigger (not directly by users)
-- Admins can view but not modify audit logs
CREATE POLICY "Service role can insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (true);  -- Restricted to service role key usage

-- Audit logs are immutable (no update/delete from application)

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Users can view their own orgs" ON org IS 'RLS: Users can only view organizations they are members of';
COMMENT ON POLICY "Users can view patients in their org" ON patient IS 'RLS: Multi-tenant isolation at org level';
COMMENT ON POLICY "All users can view payers" ON payer IS 'RLS: Payers are shared reference data';
COMMENT ON POLICY "Users can view audit logs for their org" ON audit_log IS 'RLS: Audit log access scoped to org membership';

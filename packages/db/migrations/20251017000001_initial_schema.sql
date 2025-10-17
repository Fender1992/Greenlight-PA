-- ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
-- Migration: Initial Schema | Created: 2025-10-17

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ORGANIZATIONS & USERS
-- ============================================================================

-- Organization table (clinic/practice)
CREATE TABLE org (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  npi TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Member table (links Supabase auth users to orgs with roles)
CREATE TABLE member (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,  -- References auth.users in Supabase
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff', 'referrer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_member_org_id ON member(org_id);
CREATE INDEX idx_member_user_id ON member(user_id);

-- ============================================================================
-- CLINICAL ENTITIES
-- ============================================================================

-- Patient table (de-identified in dev/demo mode)
CREATE TABLE patient (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,
  mrn TEXT,
  name TEXT NOT NULL,
  dob DATE,
  sex TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patient_org_id ON patient(org_id);
CREATE INDEX idx_patient_mrn ON patient(mrn);

-- Payer table (insurance companies)
CREATE TABLE payer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  portal_url TEXT,
  contact TEXT,
  policy_links TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payer_name ON payer(name);

-- Coverage table (patient insurance info)
CREATE TABLE coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES payer(id),
  plan_name TEXT,
  group_no TEXT,
  member_id TEXT,
  eligibility_checked_at TIMESTAMPTZ,
  raw_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coverage_org_id ON coverage(org_id);
CREATE INDEX idx_coverage_patient_id ON coverage(patient_id);
CREATE INDEX idx_coverage_payer_id ON coverage(payer_id);

-- Provider table (ordering physicians)
CREATE TABLE provider (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,
  npi TEXT,
  name TEXT NOT NULL,
  specialty TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_provider_org_id ON provider(org_id);
CREATE INDEX idx_provider_npi ON provider(npi);

-- Order table (clinical orders requiring PA)
CREATE TABLE "order" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES provider(id),
  modality TEXT NOT NULL,  -- e.g., "MRI Lumbar"
  cpt_codes TEXT[] NOT NULL,
  icd10_codes TEXT[] NOT NULL,
  clinic_notes_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_org_id ON "order"(org_id);
CREATE INDEX idx_order_patient_id ON "order"(patient_id);
CREATE INDEX idx_order_provider_id ON "order"(provider_id);

-- ============================================================================
-- PRIOR AUTHORIZATION WORKFLOW
-- ============================================================================

-- PA Status enum
CREATE TYPE pa_status AS ENUM (
  'draft',
  'submitted',
  'pending_info',
  'approved',
  'denied',
  'appealed'
);

-- Evidence Status enum
CREATE TYPE evidence_status AS ENUM (
  'pending',
  'attached',
  'waived'
);

-- PA Request table (main PA workflow entity)
CREATE TABLE pa_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES payer(id),
  priority TEXT DEFAULT 'standard' CHECK (priority IN ('standard', 'urgent')),
  status pa_status DEFAULT 'draft',
  created_by UUID,  -- References auth.users
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pa_request_org_id ON pa_request(org_id);
CREATE INDEX idx_pa_request_order_id ON pa_request(order_id);
CREATE INDEX idx_pa_request_status ON pa_request(status);
CREATE INDEX idx_pa_request_created_by ON pa_request(created_by);

-- PA Checklist Item table (payer-specific requirements)
CREATE TABLE pa_checklist_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pa_request_id UUID NOT NULL REFERENCES pa_request(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rationale TEXT,
  required_bool BOOLEAN DEFAULT TRUE,
  status evidence_status DEFAULT 'pending',
  evidence_attachment_id UUID,  -- Will reference attachment(id)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checklist_pa_request_id ON pa_checklist_item(pa_request_id);
CREATE INDEX idx_checklist_status ON pa_checklist_item(status);

-- PA Summary table (medical necessity narrative, versioned)
CREATE TABLE pa_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pa_request_id UUID NOT NULL REFERENCES pa_request(id) ON DELETE CASCADE,
  medical_necessity_text TEXT NOT NULL,
  indications_text TEXT,
  risk_benefit_text TEXT,
  generated_by_model TEXT,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_summary_pa_request_id ON pa_summary(pa_request_id);
CREATE INDEX idx_summary_version ON pa_summary(pa_request_id, version DESC);

-- ============================================================================
-- ATTACHMENTS & DOCUMENTS
-- ============================================================================

-- Attachment Type enum
CREATE TYPE attachment_type AS ENUM (
  'order',
  'imaging',
  'lab',
  'notes',
  'payer_form',
  'appeal',
  'other'
);

-- Attachment table (uploaded documents)
CREATE TABLE attachment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,  -- Supabase Storage path
  type attachment_type NOT NULL,
  ocr_text TEXT,  -- Extracted text from OCR
  sha256 TEXT,  -- File hash for integrity
  uploaded_by UUID,  -- References auth.users
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attachment_org_id ON attachment(org_id);
CREATE INDEX idx_attachment_type ON attachment(type);
CREATE INDEX idx_attachment_uploaded_by ON attachment(uploaded_by);

-- Add foreign key for evidence_attachment_id now that attachment table exists
ALTER TABLE pa_checklist_item
  ADD CONSTRAINT fk_checklist_attachment
  FOREIGN KEY (evidence_attachment_id)
  REFERENCES attachment(id)
  ON DELETE SET NULL;

-- ============================================================================
-- STATUS TRACKING & AUDIT
-- ============================================================================

-- Status Event table (status change history)
CREATE TABLE status_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pa_request_id UUID NOT NULL REFERENCES pa_request(id) ON DELETE CASCADE,
  status pa_status NOT NULL,
  note TEXT,
  actor UUID,  -- References auth.users
  at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_status_event_pa_request_id ON status_event(pa_request_id);
CREATE INDEX idx_status_event_at ON status_event(at DESC);

-- Audit Log table (comprehensive audit trail)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  user_id UUID,
  action TEXT NOT NULL,
  subject TEXT,
  subject_id UUID,
  meta_json JSONB,
  at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_org_id ON audit_log(org_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_at ON audit_log(at DESC);

-- ============================================================================
-- POLICY MANAGEMENT
-- ============================================================================

-- Policy Snippet table (payer policy knowledge base)
CREATE TABLE policy_snippet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id UUID REFERENCES payer(id),
  modality TEXT,
  cpt_code TEXT,
  snippet_text TEXT NOT NULL,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_policy_snippet_payer_id ON policy_snippet(payer_id);
CREATE INDEX idx_policy_snippet_modality ON policy_snippet(modality);
CREATE INDEX idx_policy_snippet_cpt_code ON policy_snippet(cpt_code);

-- Optional: Enable pgvector for semantic search (commented out for now)
-- CREATE EXTENSION IF NOT EXISTS vector;
-- ALTER TABLE policy_snippet ADD COLUMN embedding vector(1536);
-- CREATE INDEX idx_policy_snippet_embedding ON policy_snippet USING ivfflat (embedding vector_cosine_ops);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's org_id from membership
CREATE OR REPLACE FUNCTION get_user_org_ids(user_uuid UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
    SELECT org_id FROM member WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin of an org
CREATE OR REPLACE FUNCTION is_org_admin(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM member
    WHERE user_id = user_uuid
      AND org_id = org_uuid
      AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to audit actions
CREATE OR REPLACE FUNCTION audit_action(
  p_org_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_subject TEXT,
  p_subject_id UUID,
  p_meta_json JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO audit_log (org_id, user_id, action, subject, subject_id, meta_json)
  VALUES (p_org_id, p_user_id, p_action, p_subject, p_subject_id, p_meta_json)
  RETURNING id INTO audit_id;

  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE org IS 'Healthcare organizations (clinics, practices)';
COMMENT ON TABLE member IS 'User membership in organizations with role-based access';
COMMENT ON TABLE patient IS 'Patient records (de-identified in demo mode)';
COMMENT ON TABLE payer IS 'Insurance payers and their policies';
COMMENT ON TABLE coverage IS 'Patient insurance coverage information';
COMMENT ON TABLE provider IS 'Ordering providers (physicians)';
COMMENT ON TABLE "order" IS 'Clinical orders requiring prior authorization';
COMMENT ON TABLE pa_request IS 'Prior authorization requests (main workflow entity)';
COMMENT ON TABLE pa_checklist_item IS 'Payer-specific checklist requirements';
COMMENT ON TABLE pa_summary IS 'Medical necessity summaries (versioned)';
COMMENT ON TABLE attachment IS 'Uploaded documents and evidence';
COMMENT ON TABLE status_event IS 'PA status change history';
COMMENT ON TABLE policy_snippet IS 'Payer policy knowledge base';
COMMENT ON TABLE audit_log IS 'Comprehensive audit trail for compliance';

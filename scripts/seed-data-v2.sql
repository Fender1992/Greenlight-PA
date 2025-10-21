-- ⚠️  Seed Test Data for Greenlight PA (Version 2 - No auth.uid dependency)
-- Run this in your Supabase SQL Editor
-- This version works without being logged in

-- ==================================================
-- 0. GET THE MOST RECENT USER ID AND ORG ID
-- ==================================================
-- First, run this to see your user_id and org_id:
-- SELECT u.id as user_id, u.email, m.org_id
-- FROM auth.users u
-- JOIN member m ON m.user_id = u.id
-- ORDER BY u.created_at DESC LIMIT 1;

-- Then replace USER_ID_HERE and ORG_ID_HERE below with the actual values

-- ==================================================
-- 1. SEED PAYERS (shared across all organizations)
-- ==================================================

INSERT INTO payer (name, portal_url, contact)
VALUES
  ('BlueCross BlueShield', 'https://www.bcbs.com', 'provider-services@bcbs.com'),
  ('Aetna', 'https://www.aetna.com', 'provider-services@aetna.com'),
  ('UnitedHealthcare', 'https://www.uhc.com', 'provider-services@uhc.com'),
  ('Cigna', 'https://www.cigna.com', 'provider-services@cigna.com'),
  ('Medicare', 'https://www.cms.gov', '1-800-MEDICARE')
ON CONFLICT DO NOTHING;

-- ==================================================
-- 2. SEED POLICY SNIPPETS (using payer IDs)
-- ==================================================

INSERT INTO policy_snippet (payer_id, modality, cpt_code, snippet_text, source_url)
SELECT p.id, 'MRI Brain', '70553',
  'Prior authorization required for MRI Brain with and without contrast (CPT 70553). Must document: 1) Persistent headaches not responding to conservative therapy for 6+ weeks, 2) Neurological exam findings, 3) Previous imaging if available.',
  'https://example.com/bcbs-mri-brain'
FROM payer p WHERE p.name = 'BlueCross BlueShield'
ON CONFLICT DO NOTHING;

INSERT INTO policy_snippet (payer_id, modality, cpt_code, snippet_text, source_url)
SELECT p.id, 'CT Chest', '71260',
  'PA required for CT Chest with contrast (CPT 71260). Documentation needed: 1) Chest X-ray results, 2) Clinical indication for CT vs MRI, 3) Contraindications to MRI if applicable.',
  'https://example.com/aetna-ct-chest'
FROM payer p WHERE p.name = 'Aetna'
ON CONFLICT DO NOTHING;

INSERT INTO policy_snippet (payer_id, modality, cpt_code, snippet_text, source_url)
SELECT p.id, 'MRI Lumbar Spine', '72148',
  'PA required for lumbar spine MRI without contrast (CPT 72148). Must include: 1) Duration of symptoms (minimum 6 weeks), 2) Conservative treatment attempts (PT, medications), 3) Red flag symptoms if applicable.',
  'https://example.com/uhc-mri-lumbar'
FROM payer p WHERE p.name = 'UnitedHealthcare'
ON CONFLICT DO NOTHING;

INSERT INTO policy_snippet (payer_id, modality, cpt_code, snippet_text, source_url)
SELECT p.id, 'CT Abdomen/Pelvis', '74177',
  'PA required for CT abdomen/pelvis with contrast (CPT 74177). Documentation: 1) Acute vs chronic symptoms, 2) Lab results (CBC, metabolic panel), 3) Ultrasound results if performed.',
  'https://example.com/bcbs-ct-abdomen'
FROM payer p WHERE p.name = 'BlueCross BlueShield'
ON CONFLICT DO NOTHING;

-- ==================================================
-- 3. SET YOUR USER_ID AND ORG_ID HERE
-- ==================================================
DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Get the most recent user and their org
  SELECT u.id, m.org_id INTO v_user_id, v_org_id
  FROM auth.users u
  JOIN member m ON m.user_id = u.id
  ORDER BY u.created_at DESC
  LIMIT 1;

  IF v_user_id IS NULL OR v_org_id IS NULL THEN
    RAISE EXCEPTION 'No user or org found. Please sign up first.';
  END IF;

  RAISE NOTICE 'Using user_id: %, org_id: %', v_user_id, v_org_id;

  -- ==================================================
  -- 4. SEED PROVIDERS
  -- ==================================================
  INSERT INTO provider (org_id, name, specialty, npi)
  VALUES
    (v_org_id, 'Dr. Emily Rodriguez', 'Radiology', '1234567890'),
    (v_org_id, 'Dr. Michael Chen', 'Orthopedic Surgery', '0987654321'),
    (v_org_id, 'Dr. Sarah Johnson', 'Neurology', '1122334455'),
    (v_org_id, 'Dr. James Williams', 'Internal Medicine', '5544332211')
  ON CONFLICT DO NOTHING;

  -- ==================================================
  -- 5. SEED PATIENTS
  -- ==================================================
  INSERT INTO patient (org_id, name, dob, mrn, phone, sex, address)
  VALUES
    (v_org_id, 'John Anderson', '1975-03-15'::DATE, 'MRN001234', '555-0101', 'M', '123 Main St, Anytown, USA'),
    (v_org_id, 'Maria Garcia', '1982-07-22'::DATE, 'MRN001235', '555-0102', 'F', '456 Oak Ave, Anytown, USA'),
    (v_org_id, 'Robert Thompson', '1968-11-08'::DATE, 'MRN001236', '555-0103', 'M', '789 Pine Rd, Anytown, USA'),
    (v_org_id, 'Lisa Martinez', '1990-05-30'::DATE, 'MRN001237', '555-0104', 'F', '321 Elm St, Anytown, USA'),
    (v_org_id, 'David Lee', '1955-09-12'::DATE, 'MRN001238', '555-0105', 'M', '654 Maple Dr, Anytown, USA')
  ON CONFLICT DO NOTHING;

  -- ==================================================
  -- 6. SEED ORDERS
  -- ==================================================
  INSERT INTO "order" (org_id, patient_id, provider_id, modality, cpt_codes, icd10_codes, clinic_notes_text)
  SELECT
    v_org_id,
    (SELECT id FROM patient WHERE mrn = 'MRN001234' AND org_id = v_org_id),
    (SELECT id FROM provider WHERE name = 'Dr. Emily Rodriguez' AND org_id = v_org_id),
    'MRI Brain',
    ARRAY['70553'],
    ARRAY['G89.29', 'R51.9'],
    '62 yo male with persistent headaches x 8 weeks, not responding to NSAIDs. Neurological exam shows mild photophobia.'
  WHERE NOT EXISTS (SELECT 1 FROM "order" WHERE org_id = v_org_id AND modality = 'MRI Brain');

  INSERT INTO "order" (org_id, patient_id, provider_id, modality, cpt_codes, icd10_codes, clinic_notes_text)
  SELECT
    v_org_id,
    (SELECT id FROM patient WHERE mrn = 'MRN001235' AND org_id = v_org_id),
    (SELECT id FROM provider WHERE name = 'Dr. Michael Chen' AND org_id = v_org_id),
    'MRI Lumbar Spine',
    ARRAY['72148'],
    ARRAY['M54.5', 'M51.26'],
    '45 yo female with chronic low back pain x 3 months. Failed conservative therapy including PT x 6 weeks and NSAIDs.'
  WHERE NOT EXISTS (SELECT 1 FROM "order" WHERE org_id = v_org_id AND modality = 'MRI Lumbar Spine');

  INSERT INTO "order" (org_id, patient_id, provider_id, modality, cpt_codes, icd10_codes, clinic_notes_text)
  SELECT
    v_org_id,
    (SELECT id FROM patient WHERE mrn = 'MRN001236' AND org_id = v_org_id),
    (SELECT id FROM provider WHERE name = 'Dr. Emily Rodriguez' AND org_id = v_org_id),
    'CT Chest',
    ARRAY['71260'],
    ARRAY['J18.9'],
    '58 yo male with pneumonia, not improving after 7 days of antibiotics. Chest X-ray shows persistent infiltrate.'
  WHERE NOT EXISTS (SELECT 1 FROM "order" WHERE org_id = v_org_id AND modality = 'CT Chest');

  INSERT INTO "order" (org_id, patient_id, provider_id, modality, cpt_codes, icd10_codes, clinic_notes_text)
  SELECT
    v_org_id,
    (SELECT id FROM patient WHERE mrn = 'MRN001237' AND org_id = v_org_id),
    (SELECT id FROM provider WHERE name = 'Dr. Sarah Johnson' AND org_id = v_org_id),
    'MRI Brain',
    ARRAY['70553'],
    ARRAY['G43.909'],
    '35 yo female with new onset severe headaches, visual changes. Concern for underlying pathology vs complex migraine.'
  WHERE NOT EXISTS (SELECT 1 FROM "order" WHERE org_id = v_org_id AND modality = 'MRI Brain' AND patient_id = (SELECT id FROM patient WHERE mrn = 'MRN001237'));

  INSERT INTO "order" (org_id, patient_id, provider_id, modality, cpt_codes, icd10_codes, clinic_notes_text)
  SELECT
    v_org_id,
    (SELECT id FROM patient WHERE mrn = 'MRN001238' AND org_id = v_org_id),
    (SELECT id FROM provider WHERE name = 'Dr. James Williams' AND org_id = v_org_id),
    'CT Abdomen/Pelvis',
    ARRAY['74177'],
    ARRAY['R10.9'],
    '67 yo male with acute abdominal pain, elevated WBC 15K. Ultrasound inconclusive.'
  WHERE NOT EXISTS (SELECT 1 FROM "order" WHERE org_id = v_org_id AND modality = 'CT Abdomen/Pelvis');

  -- ==================================================
  -- 7. SEED PA REQUESTS
  -- ==================================================

  -- Draft PA
  INSERT INTO pa_request (org_id, order_id, payer_id, status, priority)
  SELECT
    v_org_id,
    (SELECT id FROM "order" WHERE modality = 'MRI Brain' AND org_id = v_org_id ORDER BY created_at LIMIT 1),
    (SELECT id FROM payer WHERE name = 'BlueCross BlueShield'),
    'draft',
    'standard'
  WHERE NOT EXISTS (SELECT 1 FROM pa_request WHERE org_id = v_org_id AND status = 'draft');

  -- Submitted PA
  INSERT INTO pa_request (org_id, order_id, payer_id, status, priority, submitted_at)
  SELECT
    v_org_id,
    (SELECT id FROM "order" WHERE modality = 'MRI Lumbar Spine' AND org_id = v_org_id),
    (SELECT id FROM payer WHERE name = 'UnitedHealthcare'),
    'submitted',
    'standard',
    NOW() - INTERVAL '2 days'
  WHERE NOT EXISTS (SELECT 1 FROM pa_request WHERE org_id = v_org_id AND status = 'submitted');

  -- Pending Info PA
  INSERT INTO pa_request (org_id, order_id, payer_id, status, priority, submitted_at)
  SELECT
    v_org_id,
    (SELECT id FROM "order" WHERE modality = 'CT Chest' AND org_id = v_org_id),
    (SELECT id FROM payer WHERE name = 'Aetna'),
    'pending_info',
    'urgent',
    NOW() - INTERVAL '5 days'
  WHERE NOT EXISTS (SELECT 1 FROM pa_request WHERE org_id = v_org_id AND status = 'pending_info');

  -- Approved PA
  INSERT INTO pa_request (org_id, order_id, payer_id, status, priority, submitted_at)
  SELECT
    v_org_id,
    (SELECT o.id FROM "order" o JOIN patient p ON o.patient_id = p.id WHERE o.modality = 'MRI Brain' AND p.name = 'Lisa Martinez' AND o.org_id = v_org_id),
    (SELECT id FROM payer WHERE name = 'BlueCross BlueShield'),
    'approved',
    'urgent',
    NOW() - INTERVAL '7 days'
  WHERE NOT EXISTS (SELECT 1 FROM pa_request WHERE org_id = v_org_id AND status = 'approved');

  RAISE NOTICE 'Seed data created successfully!';
END $$;

-- ==================================================
-- DONE!
-- ==================================================
-- Run this query to verify your data:
-- SELECT
--   (SELECT COUNT(*) FROM provider WHERE org_id IN (SELECT org_id FROM member WHERE user_id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1))) as providers,
--   (SELECT COUNT(*) FROM patient WHERE org_id IN (SELECT org_id FROM member WHERE user_id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1))) as patients,
--   (SELECT COUNT(*) FROM "order" WHERE org_id IN (SELECT org_id FROM member WHERE user_id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1))) as orders,
--   (SELECT COUNT(*) FROM pa_request WHERE org_id IN (SELECT org_id FROM member WHERE user_id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1))) as pa_requests;

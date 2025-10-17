-- ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
-- Seed: Demo Data (No PHI) | Created: 2025-10-17

-- IMPORTANT: This seed contains DEMO DATA ONLY - no real PHI
-- All names, dates, and identifiers are fictional

-- ============================================================================
-- RESET DATA (for development only - DO NOT RUN IN PRODUCTION)
-- ============================================================================

-- Uncomment to clear existing data (dev only)
-- TRUNCATE audit_log, status_event, attachment, pa_summary, pa_checklist_item, pa_request, "order", provider, coverage, patient, member, org, payer, policy_snippet CASCADE;

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================

-- Demo organization
INSERT INTO org (id, name, npi, address, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'Demo Clinic', '1234567890', '123 Healthcare Dr, Demo City, ST 12345', NOW() - INTERVAL '90 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- USERS / MEMBERS
-- ============================================================================

-- NOTE: In real deployment, these would be Supabase auth.users UUIDs
-- For demo, we use placeholder UUIDs that match auth.users created separately

-- Admin user
INSERT INTO member (id, org_id, user_id, role, created_at) VALUES
('22222222-2222-2222-2222-222222222222',
 '11111111-1111-1111-1111-111111111111',
 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',  -- Placeholder for auth.users UUID
 'admin',
 NOW() - INTERVAL '90 days')
ON CONFLICT (id) DO NOTHING;

-- Staff user
INSERT INTO member (id, org_id, user_id, role, created_at) VALUES
('22222222-2222-2222-2222-222222222223',
 '11111111-1111-1111-1111-111111111111',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',  -- Placeholder for auth.users UUID
 'staff',
 NOW() - INTERVAL '90 days')
ON CONFLICT (id) DO NOTHING;

-- Referrer user
INSERT INTO member (id, org_id, user_id, role, created_at) VALUES
('22222222-2222-2222-2222-222222222224',
 '11111111-1111-1111-1111-111111111111',
 'cccccccc-cccc-cccc-cccc-cccccccccccc',  -- Placeholder for auth.users UUID
 'referrer',
 NOW() - INTERVAL '60 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PAYERS (Shared reference data)
-- ============================================================================

INSERT INTO payer (id, name, portal_url, contact, policy_links, created_at) VALUES
('33333333-3333-3333-3333-333333333331',
 'Blue Cross Demo Shield',
 'https://portal.bcbs.demo',
 '1-800-DEMO-INS',
 ARRAY['https://policies.bcbs.demo/imaging', 'https://policies.bcbs.demo/pa-guide'],
 NOW() - INTERVAL '180 days'),

('33333333-3333-3333-3333-333333333332',
 'United Demo Health',
 'https://portal.uhc.demo',
 '1-888-DEMO-UHC',
 ARRAY['https://policies.uhc.demo/prior-auth'],
 NOW() - INTERVAL '180 days'),

('33333333-3333-3333-3333-333333333333',
 'Aetna Demo Plan',
 'https://portal.aetna.demo',
 '1-877-DEMO-AET',
 ARRAY['https://policies.aetna.demo/medical-necessity'],
 NOW() - INTERVAL '180 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PATIENTS (De-identified demo data)
-- ============================================================================

INSERT INTO patient (id, org_id, mrn, name, dob, sex, phone, address, created_at) VALUES
('44444444-4444-4444-4444-444444444441',
 '11111111-1111-1111-1111-111111111111',
 'DEMO-001',
 'Patient Alpha',
 '1975-03-15',
 'M',
 '555-0101',
 '101 Demo St, Anytown, ST 12345',
 NOW() - INTERVAL '60 days'),

('44444444-4444-4444-4444-444444444442',
 '11111111-1111-1111-1111-111111111111',
 'DEMO-002',
 'Patient Bravo',
 '1982-07-22',
 'F',
 '555-0102',
 '202 Demo Ave, Anytown, ST 12345',
 NOW() - INTERVAL '55 days'),

('44444444-4444-4444-4444-444444444443',
 '11111111-1111-1111-1111-111111111111',
 'DEMO-003',
 'Patient Charlie',
 '1968-11-30',
 'M',
 '555-0103',
 '303 Demo Blvd, Anytown, ST 12345',
 NOW() - INTERVAL '50 days'),

('44444444-4444-4444-4444-444444444444',
 '11111111-1111-1111-1111-111111111111',
 'DEMO-004',
 'Patient Delta',
 '1990-05-18',
 'F',
 '555-0104',
 '404 Demo Ln, Anytown, ST 12345',
 NOW() - INTERVAL '45 days'),

('44444444-4444-4444-4444-444444444445',
 '11111111-1111-1111-1111-111111111111',
 'DEMO-005',
 'Patient Echo',
 '1955-09-08',
 'M',
 '555-0105',
 '505 Demo Rd, Anytown, ST 12345',
 NOW() - INTERVAL '40 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- COVERAGE
-- ============================================================================

INSERT INTO coverage (id, org_id, patient_id, payer_id, plan_name, group_no, member_id, eligibility_checked_at, created_at) VALUES
('55555555-5555-5555-5555-555555555551',
 '11111111-1111-1111-1111-111111111111',
 '44444444-4444-4444-4444-444444444441',
 '33333333-3333-3333-3333-333333333331',
 'Blue Shield PPO',
 'DEMO-GRP-001',
 'DEMO-MEM-001',
 NOW() - INTERVAL '30 days',
 NOW() - INTERVAL '60 days'),

('55555555-5555-5555-5555-555555555552',
 '11111111-1111-1111-1111-111111111111',
 '44444444-4444-4444-4444-444444444442',
 '33333333-3333-3333-3333-333333333332',
 'United Choice Plus',
 'DEMO-GRP-002',
 'DEMO-MEM-002',
 NOW() - INTERVAL '25 days',
 NOW() - INTERVAL '55 days'),

('55555555-5555-5555-5555-555555555553',
 '11111111-1111-1111-1111-111111111111',
 '44444444-4444-4444-4444-444444444443',
 '33333333-3333-3333-3333-333333333333',
 'Aetna Open Access',
 'DEMO-GRP-003',
 'DEMO-MEM-003',
 NOW() - INTERVAL '20 days',
 NOW() - INTERVAL '50 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PROVIDERS
-- ============================================================================

INSERT INTO provider (id, org_id, npi, name, specialty, location, created_at) VALUES
('66666666-6666-6666-6666-666666666661',
 '11111111-1111-1111-1111-111111111111',
 '9876543210',
 'Dr. Jane Smith',
 'Orthopedic Surgery',
 'Main Campus',
 NOW() - INTERVAL '90 days'),

('66666666-6666-6666-6666-666666666662',
 '11111111-1111-1111-1111-111111111111',
 '9876543211',
 'Dr. John Doe',
 'Pain Management',
 'West Clinic',
 NOW() - INTERVAL '90 days'),

('66666666-6666-6666-6666-666666666663',
 '11111111-1111-1111-1111-111111111111',
 '9876543212',
 'Dr. Sarah Johnson',
 'Neurology',
 'Main Campus',
 NOW() - INTERVAL '85 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ORDERS
-- ============================================================================

INSERT INTO "order" (id, org_id, patient_id, provider_id, modality, cpt_codes, icd10_codes, clinic_notes_text, created_at) VALUES
('77777777-7777-7777-7777-777777777771',
 '11111111-1111-1111-1111-111111111111',
 '44444444-4444-4444-4444-444444444441',
 '66666666-6666-6666-6666-666666666661',
 'MRI Lumbar Spine',
 ARRAY['72148'],
 ARRAY['M54.5', 'M51.26'],
 'Chronic lower back pain with radiculopathy. Failed conservative therapy (NSAIDs 8 weeks, PT 12 sessions). Neurological exam shows L5 distribution weakness.',
 NOW() - INTERVAL '14 days'),

('77777777-7777-7777-7777-777777777772',
 '11111111-1111-1111-1111-111111111111',
 '44444444-4444-4444-4444-444444444442',
 '66666666-6666-6666-6666-666666666662',
 'CT Abdomen/Pelvis with Contrast',
 ARRAY['74177'],
 ARRAY['R10.9', 'K92.1'],
 'Severe abdominal pain, concern for appendicitis vs. diverticulitis. Previous ultrasound inconclusive.',
 NOW() - INTERVAL '7 days'),

('77777777-7777-7777-7777-777777777773',
 '11111111-1111-1111-1111-111111111111',
 '44444444-4444-4444-4444-444444444443',
 '66666666-6666-6666-6666-666666666661',
 'MRI Knee Right',
 ARRAY['73721'],
 ARRAY['M23.91', 'S83.401A'],
 'Post-traumatic right knee pain. Positive McMurray test. Suspected meniscal tear.',
 NOW() - INTERVAL '10 days'),

('77777777-7777-7777-7777-777777777774',
 '11111111-1111-1111-1111-111111111111',
 '44444444-4444-4444-4444-444444444444',
 '66666666-6666-6666-6666-666666666663',
 'MRI Brain with and without Contrast',
 ARRAY['70553'],
 ARRAY['G43.909', 'R51.9'],
 'New onset severe headaches with visual disturbances. Neurological exam shows subtle findings. Rule out intracranial pathology.',
 NOW() - INTERVAL '5 days'),

('77777777-7777-7777-7777-777777777775',
 '11111111-1111-1111-1111-111111111111',
 '44444444-4444-4444-4444-444444444445',
 '66666666-6666-6666-6666-666666666661',
 'MRI Cervical Spine',
 ARRAY['72141'],
 ARRAY['M54.2', 'M50.30'],
 'Neck pain radiating to bilateral upper extremities. Positive Spurling test. Failed 6 weeks conservative care.',
 NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PA REQUESTS (3 draft requests)
-- ============================================================================

INSERT INTO pa_request (id, org_id, order_id, payer_id, priority, status, created_by, created_at) VALUES
('88888888-8888-8888-8888-888888888881',
 '11111111-1111-1111-1111-111111111111',
 '77777777-7777-7777-7777-777777777771',
 '33333333-3333-3333-3333-333333333331',
 'standard',
 'draft',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
 NOW() - INTERVAL '2 days'),

('88888888-8888-8888-8888-888888888882',
 '11111111-1111-1111-1111-111111111111',
 '77777777-7777-7777-7777-777777777772',
 '33333333-3333-3333-3333-333333333332',
 'urgent',
 'draft',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
 NOW() - INTERVAL '1 day'),

('88888888-8888-8888-8888-888888888883',
 '11111111-1111-1111-1111-111111111111',
 '77777777-7777-7777-7777-777777777773',
 '33333333-3333-3333-3333-333333333333',
 'standard',
 'draft',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
 NOW() - INTERVAL '12 hours')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- POLICY SNIPPETS (6 snippets)
-- ============================================================================

INSERT INTO policy_snippet (id, payer_id, modality, cpt_code, snippet_text, source_url, created_at) VALUES
('99999999-9999-9999-9999-999999999991',
 '33333333-3333-3333-3333-333333333331',
 'MRI Lumbar Spine',
 '72148',
 'MRI lumbar spine requires: (1) conservative therapy ≥6 weeks (NSAIDs, PT), (2) neurological exam documenting radiculopathy, (3) red flags ruled out. Prior imaging required if symptoms >3 months.',
 'https://policies.bcbs.demo/imaging/lumbar-mri-2024',
 NOW() - INTERVAL '180 days'),

('99999999-9999-9999-9999-999999999992',
 '33333333-3333-3333-3333-333333333332',
 'MRI Lumbar Spine',
 '72148',
 'Lumbar MRI authorization criteria: Failed conservative management minimum 8 weeks unless red flag symptoms present. Documentation must include physical exam findings consistent with radiculopathy.',
 'https://policies.uhc.demo/mri-spine-policy',
 NOW() - INTERVAL '170 days'),

('99999999-9999-9999-9999-999999999993',
 '33333333-3333-3333-3333-333333333333',
 'MRI Knee',
 '73721',
 'Knee MRI approved for: acute trauma with suspected meniscal/ligament tear, positive clinical tests (McMurray, Lachman), failed conservative care if chronic. X-ray required first.',
 'https://policies.aetna.demo/orthopedic-imaging',
 NOW() - INTERVAL '160 days'),

('99999999-9999-9999-9999-999999999994',
 '33333333-3333-3333-3333-333333333331',
 'CT Abdomen',
 '74177',
 'CT abdomen with contrast requires documented clinical indication (acute abdominal pain, fever, peritoneal signs). Ultrasound should be attempted first unless contraindicated.',
 'https://policies.bcbs.demo/imaging/ct-abdomen',
 NOW() - INTERVAL '150 days'),

('99999999-9999-9999-9999-999999999995',
 '33333333-3333-3333-3333-333333333332',
 'MRI Brain',
 '70553',
 'Brain MRI with/without contrast indicated for: new neurological deficits, severe headache with red flags, stroke workup, suspected tumor. Headache alone does not meet criteria without additional findings.',
 'https://policies.uhc.demo/neuro-imaging',
 NOW() - INTERVAL '140 days'),

('99999999-9999-9999-9999-999999999996',
 '33333333-3333-3333-3333-333333333333',
 'MRI Cervical Spine',
 '72141',
 'Cervical MRI requires: neck/arm pain >6 weeks, positive provocative tests (Spurling), failed conservative therapy, neurological findings. Document prior treatments.',
 'https://policies.aetna.demo/spine-imaging',
 NOW() - INTERVAL '130 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- AUDIT LOG (Sample entries)
-- ============================================================================

INSERT INTO audit_log (org_id, user_id, action, subject, subject_id, meta_json, at) VALUES
('11111111-1111-1111-1111-111111111111',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
 'CREATE',
 'patient',
 '44444444-4444-4444-4444-444444444441',
 '{"method": "web_form"}',
 NOW() - INTERVAL '60 days'),

('11111111-1111-1111-1111-111111111111',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
 'CREATE',
 'order',
 '77777777-7777-7777-7777-777777777771',
 '{"modality": "MRI Lumbar Spine"}',
 NOW() - INTERVAL '14 days'),

('11111111-1111-1111-1111-111111111111',
 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
 'CREATE',
 'pa_request',
 '88888888-8888-8888-8888-888888888881',
 '{"status": "draft", "priority": "standard"}',
 NOW() - INTERVAL '2 days');

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- Verify seed data
DO $$
DECLARE
  org_count INT;
  member_count INT;
  patient_count INT;
  payer_count INT;
  order_count INT;
  pa_count INT;
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO org_count FROM org;
  SELECT COUNT(*) INTO member_count FROM member;
  SELECT COUNT(*) INTO patient_count FROM patient;
  SELECT COUNT(*) INTO payer_count FROM payer;
  SELECT COUNT(*) INTO order_count FROM "order";
  SELECT COUNT(*) INTO pa_count FROM pa_request;
  SELECT COUNT(*) INTO policy_count FROM policy_snippet;

  RAISE NOTICE '====== SEED DATA SUMMARY ======';
  RAISE NOTICE 'Organizations: %', org_count;
  RAISE NOTICE 'Members: %', member_count;
  RAISE NOTICE 'Patients: %', patient_count;
  RAISE NOTICE 'Payers: %', payer_count;
  RAISE NOTICE 'Orders: %', order_count;
  RAISE NOTICE 'PA Requests: %', pa_count;
  RAISE NOTICE 'Policy Snippets: %', policy_count;
  RAISE NOTICE '================================';
END $$;

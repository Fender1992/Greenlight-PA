-- ⚠️  Seed Test Data for Greenlight PA
-- Run this in your Supabase SQL Editor
-- Make sure you have already signed up and created an account first

-- ==================================================
-- 1. SEED PAYERS (shared across all organizations)
-- ==================================================

INSERT INTO payer (name, prior_auth_required, typical_turnaround_days)
VALUES
  ('BlueCross BlueShield', true, 3),
  ('Aetna', true, 5),
  ('UnitedHealthcare', true, 2),
  ('Cigna', true, 4),
  ('Medicare', false, 7)
ON CONFLICT DO NOTHING;

-- ==================================================
-- 2. SEED POLICY SNIPPETS (using payer IDs)
-- ==================================================

INSERT INTO policy_snippet (payer_id, modality, cpt_codes, icd10_codes, requirement_text, approval_criteria, source_url)
SELECT
  p.id,
  'MRI Brain',
  ARRAY['70551', '70552', '70553'],
  ARRAY['G89.29', 'R51.9'],
  'Prior authorization required for MRI Brain. Must document: 1) Persistent headaches not responding to conservative therapy for 6+ weeks, 2) Neurological exam findings, 3) Previous imaging if available.',
  'Approved if clinical documentation supports medical necessity and conservative treatments have been attempted.',
  'https://example.com/bcbs-mri-brain'
FROM payer p WHERE p.name = 'BlueCross BlueShield'
UNION ALL
SELECT
  p.id,
  'CT Chest',
  ARRAY['71250', '71260', '71270'],
  ARRAY['J18.9', 'R05'],
  'PA required for CT Chest with contrast. Documentation needed: 1) Chest X-ray results, 2) Clinical indication for CT vs MRI, 3) Contraindications to MRI if applicable.',
  'Approved for pneumonia complications, suspected malignancy, or when chest X-ray is inconclusive.',
  'https://example.com/aetna-ct-chest'
FROM payer p WHERE p.name = 'Aetna'
UNION ALL
SELECT
  p.id,
  'MRI Lumbar Spine',
  ARRAY['72148', '72149'],
  ARRAY['M54.5', 'M51.26'],
  'PA required for lumbar spine MRI. Must include: 1) Duration of symptoms (minimum 6 weeks), 2) Conservative treatment attempts (PT, medications), 3) Red flag symptoms if applicable.',
  'Approved for chronic low back pain after failed conservative therapy, radiculopathy, or red flag symptoms.',
  'https://example.com/uhc-mri-lumbar'
FROM payer p WHERE p.name = 'UnitedHealthcare'
UNION ALL
SELECT
  p.id,
  'CT Abdomen/Pelvis',
  ARRAY['74176', '74177', '74178'],
  ARRAY['R10.9', 'K92.1'],
  'PA required for CT abdomen/pelvis. Documentation: 1) Acute vs chronic symptoms, 2) Lab results (CBC, metabolic panel), 3) Ultrasound results if performed.',
  'Approved for acute abdominal pain with concerning features, suspected appendicitis, or abnormal lab findings.',
  'https://example.com/bcbs-ct-abdomen'
FROM payer p WHERE p.name = 'BlueCross BlueShield';

-- ==================================================
-- 3. SEED PROVIDERS (for your organization)
-- ==================================================

INSERT INTO provider (org_id, name, specialty, npi)
SELECT
  m.org_id,
  'Dr. Emily Rodriguez',
  'Radiology',
  '1234567890'
FROM member m
WHERE m.user_id = auth.uid()
LIMIT 1
UNION ALL
SELECT
  m.org_id,
  'Dr. Michael Chen',
  'Orthopedic Surgery',
  '0987654321'
FROM member m
WHERE m.user_id = auth.uid()
LIMIT 1
UNION ALL
SELECT
  m.org_id,
  'Dr. Sarah Johnson',
  'Neurology',
  '1122334455'
FROM member m
WHERE m.user_id = auth.uid()
LIMIT 1
UNION ALL
SELECT
  m.org_id,
  'Dr. James Williams',
  'Internal Medicine',
  '5544332211'
FROM member m
WHERE m.user_id = auth.uid()
LIMIT 1;

-- ==================================================
-- 4. SEED PATIENTS (for your organization)
-- ==================================================

INSERT INTO patient (org_id, name, dob, mrn, phone, email)
SELECT
  m.org_id,
  'John Anderson',
  '1975-03-15',
  'MRN001234',
  '555-0101',
  'john.anderson@email.com'
FROM member m
WHERE m.user_id = auth.uid()
LIMIT 1
UNION ALL
SELECT
  m.org_id,
  'Maria Garcia',
  '1982-07-22',
  'MRN001235',
  '555-0102',
  'maria.garcia@email.com'
FROM member m
WHERE m.user_id = auth.uid()
LIMIT 1
UNION ALL
SELECT
  m.org_id,
  'Robert Thompson',
  '1968-11-08',
  'MRN001236',
  '555-0103',
  'robert.thompson@email.com'
FROM member m
WHERE m.user_id = auth.uid()
LIMIT 1
UNION ALL
SELECT
  m.org_id,
  'Lisa Martinez',
  '1990-05-30',
  'MRN001237',
  '555-0104',
  'lisa.martinez@email.com'
FROM member m
WHERE m.user_id = auth.uid()
LIMIT 1
UNION ALL
SELECT
  m.org_id,
  'David Lee',
  '1955-09-12',
  'MRN001238',
  '555-0105',
  'david.lee@email.com'
FROM member m
WHERE m.user_id = auth.uid()
LIMIT 1;

-- ==================================================
-- 5. SEED ORDERS (for your organization)
-- ==================================================

INSERT INTO "order" (org_id, patient_id, provider_id, modality, cpt_codes, icd10_codes, clinic_notes_text, status)
SELECT
  m.org_id,
  (SELECT id FROM patient WHERE name = 'John Anderson' AND org_id = m.org_id LIMIT 1),
  (SELECT id FROM provider WHERE name = 'Dr. Emily Rodriguez' AND org_id = m.org_id LIMIT 1),
  'MRI Brain',
  ARRAY['70553'],
  ARRAY['G89.29', 'R51.9'],
  '62 yo male with persistent headaches x 8 weeks, not responding to NSAIDs. Neurological exam shows mild photophobia. No history of migraines. Patient requesting imaging for peace of mind.',
  'active'
FROM member m
WHERE m.user_id = auth.uid()
LIMIT 1
UNION ALL
SELECT
  m.org_id,
  (SELECT id FROM patient WHERE name = 'Maria Garcia' AND org_id = m.org_id LIMIT 1),
  (SELECT id FROM provider WHERE name = 'Dr. Michael Chen' AND org_id = m.org_id LIMIT 1),
  'MRI Lumbar Spine',
  ARRAY['72148'],
  ARRAY['M54.5', 'M51.26'],
  '45 yo female with chronic low back pain x 3 months. Failed conservative therapy including PT x 6 weeks and NSAIDs. Pain radiating to left leg. Positive straight leg raise test.',
  'active'
FROM member m
WHERE m.user_id = auth.uid()
LIMIT 1
UNION ALL
SELECT
  m.org_id,
  (SELECT id FROM patient WHERE name = 'Robert Thompson' AND org_id = m.org_id LIMIT 1),
  (SELECT id FROM provider WHERE name = 'Dr. Emily Rodriguez' AND org_id = m.org_id LIMIT 1),
  'CT Chest',
  ARRAY['71260'],
  ARRAY['J18.9'],
  '58 yo male with pneumonia, not improving after 7 days of antibiotics. Chest X-ray shows persistent infiltrate. Evaluating for complications.',
  'active'
FROM member m
WHERE m.user_id = auth.uid()
LIMIT 1
UNION ALL
SELECT
  m.org_id,
  (SELECT id FROM patient WHERE name = 'Lisa Martinez' AND org_id = m.org_id LIMIT 1),
  (SELECT id FROM provider WHERE name = 'Dr. Sarah Johnson' AND org_id = m.org_id LIMIT 1),
  'MRI Brain',
  ARRAY['70553'],
  ARRAY['G43.909'],
  '35 yo female with new onset severe headaches, visual changes. Concern for underlying pathology vs complex migraine.',
  'active'
FROM member m
WHERE m.user_id = auth.uid()
LIMIT 1
UNION ALL
SELECT
  m.org_id,
  (SELECT id FROM patient WHERE name = 'David Lee' AND org_id = m.org_id LIMIT 1),
  (SELECT id FROM provider WHERE name = 'Dr. James Williams' AND org_id = m.org_id LIMIT 1),
  'CT Abdomen/Pelvis',
  ARRAY['74177'],
  ARRAY['R10.9'],
  '67 yo male with acute abdominal pain, elevated WBC 15K. Ultrasound inconclusive. Evaluating for appendicitis vs diverticulitis.',
  'active'
FROM member m
WHERE m.user_id = auth.uid()
LIMIT 1;

-- ==================================================
-- 6. SEED PA REQUESTS (for your organization)
-- ==================================================

-- Draft PA (ready to work on)
INSERT INTO pa_request (org_id, order_id, payer_id, status, priority)
SELECT
  m.org_id,
  (SELECT o.id FROM "order" o WHERE o.modality = 'MRI Brain' AND o.org_id = m.org_id ORDER BY o.created_at LIMIT 1),
  (SELECT id FROM payer WHERE name = 'BlueCross BlueShield' LIMIT 1),
  'draft',
  'standard'
FROM member m
WHERE m.user_id = auth.uid()
LIMIT 1;

-- Submitted PA (in progress)
INSERT INTO pa_request (org_id, order_id, payer_id, status, priority, submitted_at)
SELECT
  m.org_id,
  (SELECT o.id FROM "order" o WHERE o.modality = 'MRI Lumbar Spine' AND o.org_id = m.org_id LIMIT 1),
  (SELECT id FROM payer WHERE name = 'UnitedHealthcare' LIMIT 1),
  'submitted',
  'standard',
  NOW() - INTERVAL '2 days'
FROM member m
WHERE m.user_id = auth.uid()
LIMIT 1;

-- Pending Info PA (waiting for additional docs)
INSERT INTO pa_request (org_id, order_id, payer_id, status, priority, submitted_at)
SELECT
  m.org_id,
  (SELECT o.id FROM "order" o WHERE o.modality = 'CT Chest' AND o.org_id = m.org_id LIMIT 1),
  (SELECT id FROM payer WHERE name = 'Aetna' LIMIT 1),
  'pending_info',
  'urgent',
  NOW() - INTERVAL '5 days'
FROM member m
WHERE m.user_id = auth.uid()
LIMIT 1;

-- Approved PA (completed)
INSERT INTO pa_request (org_id, order_id, payer_id, status, priority, submitted_at, auth_number, decision_date)
SELECT
  m.org_id,
  (SELECT o.id FROM "order" o JOIN patient p ON o.patient_id = p.id WHERE o.modality = 'MRI Brain' AND p.name = 'Lisa Martinez' AND o.org_id = m.org_id LIMIT 1),
  (SELECT id FROM payer WHERE name = 'BlueCross BlueShield' LIMIT 1),
  'approved',
  'urgent',
  NOW() - INTERVAL '7 days',
  'AUTH-2024-001234',
  NOW() - INTERVAL '1 day'
FROM member m
WHERE m.user_id = auth.uid()
LIMIT 1;

-- ==================================================
-- 7. SEED CHECKLIST ITEMS (for Draft PA)
-- ==================================================

INSERT INTO pa_checklist_item (pa_request_id, requirement, rationale, status)
SELECT
  pa.id,
  'Conservative treatment for 6+ weeks',
  'Required by BlueCross BlueShield for MRI Brain authorization',
  'complete'
FROM pa_request pa
JOIN "order" o ON pa.order_id = o.id
WHERE pa.status = 'draft'
  AND o.modality = 'MRI Brain'
  AND pa.org_id IN (SELECT org_id FROM member WHERE user_id = auth.uid())
LIMIT 1
UNION ALL
SELECT
  pa.id,
  'Neurological examination findings documented',
  'Clinical exam needed to justify imaging',
  'complete'
FROM pa_request pa
JOIN "order" o ON pa.order_id = o.id
WHERE pa.status = 'draft'
  AND o.modality = 'MRI Brain'
  AND pa.org_id IN (SELECT org_id FROM member WHERE user_id = auth.uid())
LIMIT 1
UNION ALL
SELECT
  pa.id,
  'Previous imaging results (if applicable)',
  'Helps establish medical necessity',
  'incomplete'
FROM pa_request pa
JOIN "order" o ON pa.order_id = o.id
WHERE pa.status = 'draft'
  AND o.modality = 'MRI Brain'
  AND pa.org_id IN (SELECT org_id FROM member WHERE user_id = auth.uid())
LIMIT 1;

-- ==================================================
-- 8. SEED CHECKLIST ITEMS (for Submitted PA)
-- ==================================================

INSERT INTO pa_checklist_item (pa_request_id, requirement, rationale, status)
SELECT
  pa.id,
  'Physical therapy for minimum 6 weeks',
  'UHC requires conservative therapy before MRI',
  'complete'
FROM pa_request pa
JOIN "order" o ON pa.order_id = o.id
WHERE pa.status = 'submitted'
  AND o.modality = 'MRI Lumbar Spine'
  AND pa.org_id IN (SELECT org_id FROM member WHERE user_id = auth.uid())
LIMIT 1
UNION ALL
SELECT
  pa.id,
  'Medication trial documented',
  'Must show failed conservative treatment',
  'complete'
FROM pa_request pa
JOIN "order" o ON pa.order_id = o.id
WHERE pa.status = 'submitted'
  AND o.modality = 'MRI Lumbar Spine'
  AND pa.org_id IN (SELECT org_id FROM member WHERE user_id = auth.uid())
LIMIT 1
UNION ALL
SELECT
  pa.id,
  'Radiculopathy symptoms documented',
  'Clinical findings support need for MRI',
  'complete'
FROM pa_request pa
JOIN "order" o ON pa.order_id = o.id
WHERE pa.status = 'submitted'
  AND o.modality = 'MRI Lumbar Spine'
  AND pa.org_id IN (SELECT org_id FROM member WHERE user_id = auth.uid())
LIMIT 1;

-- ==================================================
-- 9. SEED MEDICAL NECESSITY SUMMARIES
-- ==================================================

-- For Submitted PA
INSERT INTO pa_medical_necessity (pa_request_id, summary_text)
SELECT
  pa.id,
  'MEDICAL NECESSITY:
This 45-year-old female patient presents with chronic low back pain of 3 months duration with radiculopathy. Conservative treatment including 6 weeks of physical therapy and NSAIDs has failed to provide relief. MRI Lumbar Spine is medically necessary to evaluate for herniated disc, spinal stenosis, or other structural pathology.

CLINICAL INDICATIONS:
- Chronic low back pain x 3 months
- Left lower extremity radiculopathy
- Positive straight leg raise test
- Failed conservative therapy (PT x 6 weeks, NSAIDs)

RISK/BENEFIT ANALYSIS:
The benefits of obtaining definitive imaging to guide treatment planning outweigh the minimal risks associated with MRI (no radiation exposure). Early identification of structural pathology will allow for appropriate intervention and prevent further deterioration.'
FROM pa_request pa
JOIN "order" o ON pa.order_id = o.id
WHERE pa.status = 'submitted'
  AND o.modality = 'MRI Lumbar Spine'
  AND pa.org_id IN (SELECT org_id FROM member WHERE user_id = auth.uid())
LIMIT 1;

-- For Approved PA
INSERT INTO pa_medical_necessity (pa_request_id, summary_text)
SELECT
  pa.id,
  'MEDICAL NECESSITY:
This 35-year-old female presents with new onset severe headaches and visual changes concerning for underlying intracranial pathology. MRI Brain with contrast is medically necessary to rule out tumor, vascular malformation, or other serious conditions.

CLINICAL INDICATIONS:
- New onset severe headaches
- Associated visual disturbances
- Atypical presentation for migraine
- Neurological symptoms warrant immediate evaluation

RISK/BENEFIT ANALYSIS:
Given the serious nature of potential underlying conditions, the benefits of early detection through MRI significantly outweigh the minimal risks. Timely diagnosis is critical for appropriate treatment and improved patient outcomes.'
FROM pa_request pa
JOIN "order" o ON pa.order_id = o.id
JOIN patient p ON o.patient_id = p.id
WHERE pa.status = 'approved'
  AND o.modality = 'MRI Brain'
  AND p.name = 'Lisa Martinez'
  AND pa.org_id IN (SELECT org_id FROM member WHERE user_id = auth.uid())
LIMIT 1;

-- ==================================================
-- 10. SEED STATUS EVENTS
-- ==================================================

-- For Submitted PA
INSERT INTO pa_status_event (pa_request_id, status, notes)
SELECT
  pa.id,
  'submitted',
  'PA request submitted to UnitedHealthcare via fax'
FROM pa_request pa
JOIN "order" o ON pa.order_id = o.id
WHERE pa.status = 'submitted'
  AND o.modality = 'MRI Lumbar Spine'
  AND pa.org_id IN (SELECT org_id FROM member WHERE user_id = auth.uid())
LIMIT 1;

-- For Pending Info PA
INSERT INTO pa_status_event (pa_request_id, status, notes)
SELECT
  pa.id,
  'submitted',
  'PA request submitted to Aetna online portal'
FROM pa_request pa
JOIN "order" o ON pa.order_id = o.id
WHERE pa.status = 'pending_info'
  AND o.modality = 'CT Chest'
  AND pa.org_id IN (SELECT org_id FROM member WHERE user_id = auth.uid())
LIMIT 1
UNION ALL
SELECT
  pa.id,
  'pending_info',
  'Payer requested additional clinical documentation - patient''s previous imaging reports'
FROM pa_request pa
JOIN "order" o ON pa.order_id = o.id
WHERE pa.status = 'pending_info'
  AND o.modality = 'CT Chest'
  AND pa.org_id IN (SELECT org_id FROM member WHERE user_id = auth.uid())
LIMIT 1;

-- For Approved PA
INSERT INTO pa_status_event (pa_request_id, status, notes)
SELECT
  pa.id,
  'submitted',
  'Urgent PA request submitted to BlueCross BlueShield'
FROM pa_request pa
JOIN "order" o ON pa.order_id = o.id
JOIN patient p ON o.patient_id = p.id
WHERE pa.status = 'approved'
  AND o.modality = 'MRI Brain'
  AND p.name = 'Lisa Martinez'
  AND pa.org_id IN (SELECT org_id FROM member WHERE user_id = auth.uid())
LIMIT 1
UNION ALL
SELECT
  pa.id,
  'approved',
  'PA approved. Auth #: AUTH-2024-001234. Valid for 60 days.'
FROM pa_request pa
JOIN "order" o ON pa.order_id = o.id
JOIN patient p ON o.patient_id = p.id
WHERE pa.status = 'approved'
  AND o.modality = 'MRI Brain'
  AND p.name = 'Lisa Martinez'
  AND pa.org_id IN (SELECT org_id FROM member WHERE user_id = auth.uid())
LIMIT 1;

-- ==================================================
-- DONE!
-- ==================================================
-- You should now have:
-- - 5 payers
-- - 4 policy snippets
-- - 4 providers
-- - 5 patients
-- - 5 orders
-- - 4 PA requests (draft, submitted, pending_info, approved)
-- - 6 checklist items
-- - 2 medical necessity summaries
-- - 5 status events
--
-- Refresh your Greenlight PA dashboard to see the data!
-- ==================================================

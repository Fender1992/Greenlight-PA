-- Add patient_id and provider_id columns to pa_request table
ALTER TABLE pa_request ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patient(id) ON DELETE CASCADE;
ALTER TABLE pa_request ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES provider(id) ON DELETE SET NULL;

-- Add indexes for the new foreign keys
CREATE INDEX IF NOT EXISTS idx_pa_request_patient_id ON pa_request(patient_id);
CREATE INDEX IF NOT EXISTS idx_pa_request_provider_id ON pa_request(provider_id);

-- Also add procedure_description and diagnosis_codes if they don't exist
ALTER TABLE pa_request ADD COLUMN IF NOT EXISTS procedure_description TEXT;
ALTER TABLE pa_request ADD COLUMN IF NOT EXISTS diagnosis_codes TEXT;
ALTER TABLE pa_request ADD COLUMN IF NOT EXISTS procedure_code TEXT;
ALTER TABLE pa_request ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'routine';

-- Add columns to order table for testing purposes
-- This extends the order table to support additional fields needed for order management

ALTER TABLE "order" ADD COLUMN IF NOT EXISTS pa_request_id UUID REFERENCES pa_request(id) ON DELETE CASCADE;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS order_type TEXT;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS frequency TEXT;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS order_date TIMESTAMPTZ DEFAULT NOW();

-- Add index for pa_request_id lookups
CREATE INDEX IF NOT EXISTS idx_order_pa_request_id ON "order"(pa_request_id);

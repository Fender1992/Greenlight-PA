-- Add updated_at column to member table
-- Migration: 20251127_add_member_updated_at
-- Description: Add missing updated_at column with automatic update trigger

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'member' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE member ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

    -- Backfill existing rows with created_at value
    UPDATE member SET updated_at = created_at WHERE updated_at IS NULL;

    -- Make it NOT NULL after backfill
    ALTER TABLE member ALTER COLUMN updated_at SET NOT NULL;
  END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_member_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at (drop first if exists to make idempotent)
DROP TRIGGER IF EXISTS member_updated_at ON member;

CREATE TRIGGER member_updated_at
  BEFORE UPDATE ON member
  FOR EACH ROW
  EXECUTE FUNCTION update_member_updated_at();

-- Add comment
COMMENT ON COLUMN member.updated_at IS 'Timestamp of last update, automatically maintained by trigger';

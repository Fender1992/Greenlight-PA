# Migration Instructions - Add Member Updated_At Column

**Date:** 2025-11-27
**Migration File:** `/root/greenlight-pa/packages/db/migrations/20251127_add_member_updated_at.sql`
**Status:** Ready to apply to production

---

## Issue

The `member` table is missing the `updated_at` column, which is required for proper audit tracking. This was confirmed by querying the live database - the column does not exist.

---

## Solution

Add the `updated_at` column with an automatic trigger that updates the timestamp whenever a row is modified.

---

## How to Apply

### Option 1: Supabase SQL Editor (Recommended)

1. Log into your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy the entire contents of `/root/greenlight-pa/packages/db/migrations/20251127_add_member_updated_at.sql`
4. Paste into a new query
5. Click "Run" to execute

### Option 2: Direct SQL Execution

Run the following SQL in your production database:

```sql
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
```

---

## What This Migration Does

1. **Adds `updated_at` column** - TIMESTAMPTZ type with default NOW()
2. **Backfills existing rows** - Sets updated_at = created_at for all existing records
3. **Sets NOT NULL constraint** - Ensures the column is always populated
4. **Creates trigger function** - `update_member_updated_at()` automatically sets NOW() on updates
5. **Creates trigger** - Runs before each UPDATE on the member table
6. **Adds documentation** - Column comment explains the automatic behavior

---

## Safety Features

- **Idempotent:** Safe to run multiple times - uses IF NOT EXISTS checks
- **No data loss:** Backfills with created_at before setting NOT NULL
- **Drop and recreate trigger:** Ensures clean state if rerun
- **Based on proven pattern:** Uses same trigger pattern as name_change_request table

---

## Verification

After applying the migration, verify it worked:

```sql
-- Check that column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'member' AND column_name = 'updated_at';

-- Verify trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'member_updated_at';

-- Test the trigger
UPDATE member SET status = status WHERE id = (SELECT id FROM member LIMIT 1);
SELECT id, created_at, updated_at FROM member LIMIT 5;
-- updated_at should be newer than created_at for the updated row
```

---

## Next Steps

After applying this migration:

1. ✅ Verify column exists and is populated
2. ✅ Verify trigger is working (test with an UPDATE)
3. ⏳ Update TypeScript types if needed (may already be up to date)
4. ⏳ Update any API routes that read/write member records to include updated_at

---

## Related Files

- Migration file: `/root/greenlight-pa/packages/db/migrations/20251127_add_member_updated_at.sql`
- Reference implementation: `/root/greenlight-pa/packages/db/migrations/20251024_add_name_change_and_notifications.sql` (lines 124-137)
- Work log: `/root/greenlight-pa/AGENT_WORK_LOG.md`
- Status: `/root/greenlight-pa/STATUS.md`

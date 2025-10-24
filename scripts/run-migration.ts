/**
 * Script to execute database migration
 * Run with: npx tsx scripts/run-migration.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const supabaseUrl = "https://xhbtofepcnhqxtosrzrm.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoYnRvZmVwY25ocXh0b3NyenJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcyMTMzMSwiZXhwIjoyMDc2Mjk3MzMxfQ.m9A7-Ny9jFn_PQPrdKglrUP0SpjQ7stwYw57zvvmUWA";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log("🚀 Starting migration: Add member.status field...\n");

  try {
    // Check current member table structure
    console.log("🔍 Checking current member table structure...");
    const { data: currentMembers, error: checkError } = await supabase
      .from("member")
      .select("*")
      .limit(1);

    if (checkError) {
      console.error("❌ Error checking member table:", checkError.message);
      throw checkError;
    }

    console.log("✅ Current member table accessible");
    if (currentMembers && currentMembers.length > 0) {
      console.log("   Sample row keys:", Object.keys(currentMembers[0]));
      const hasStatus = "status" in currentMembers[0];
      console.log("   Has status field:", hasStatus);

      if (hasStatus) {
        console.log("\n⚠️  WARNING: status column already exists!");
        console.log("   Migration may have already been applied.");
        console.log("   Checking current status values...\n");

        const { data: allMembers } = await supabase
          .from("member")
          .select("status");

        if (allMembers) {
          const statusCounts: Record<string, number> = {};
          allMembers.forEach((m: any) => {
            statusCounts[m.status] = (statusCounts[m.status] || 0) + 1;
          });
          console.log("   Status distribution:", statusCounts);
        }

        console.log("\n✅ Migration already applied, skipping.\n");
        return;
      }
    }

    console.log(
      "\n⚠️  This migration requires SQL execution via Supabase Dashboard"
    );
    console.log(
      "   The status column needs to be added with a CHECK constraint\n"
    );

    console.log("📋 MANUAL MIGRATION STEPS:");
    console.log(
      "   1. Go to: https://supabase.com/dashboard/project/xhbtofepcnhqxtosrzrm/sql/new"
    );
    console.log(
      "   2. Copy the SQL from: packages/db/migrations/20251024_add_member_status.sql"
    );
    console.log("   3. Paste and run the SQL");
    console.log("   4. Verify the migration completed successfully\n");

    console.log("📄 Quick SQL to run (or use the full migration file):");
    console.log(`
-- Add status column
ALTER TABLE member
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
CHECK (status IN ('pending', 'active', 'rejected'));

-- Set existing members to active
UPDATE member SET status = 'active';

-- Add indexes
CREATE INDEX idx_member_status ON member(status);
CREATE INDEX idx_member_org_status ON member(org_id, status);

-- Update helper function
CREATE OR REPLACE FUNCTION get_user_org_ids(user_uuid UUID)
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(org_id)
  FROM member
  WHERE user_id = user_uuid
    AND status = 'active';
$$ LANGUAGE SQL SECURITY DEFINER;

-- Update admin checker function
CREATE OR REPLACE FUNCTION is_org_admin(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM member
    WHERE user_id = user_uuid
      AND org_id = org_uuid
      AND role = 'admin'
      AND status = 'active'
  );
$$ LANGUAGE SQL SECURITY DEFINER;
`);

    console.log("\n⏳ Waiting for you to run the migration manually...");
    console.log(
      "   Press Ctrl+C when done, then run this script again to verify.\n"
    );
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

runMigration();

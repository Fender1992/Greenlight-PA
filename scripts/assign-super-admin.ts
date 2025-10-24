/**
 * Script to assign super admin role to a user by email
 * Run with: npx tsx scripts/assign-super-admin.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xhbtofepcnhqxtosrzrm.supabase.co";
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoYnRvZmVwY25ocXh0b3NyenJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcyMTMzMSwiZXhwIjoyMDc2Mjk3MzMxfQ.m9A7-Ny9jFn_PQPrdKglrUP0SpjQ7stwYw57zvvmUWA";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const SUPER_ADMIN_EMAIL = "rolandofender@gmail.com";

async function assignSuperAdmin() {
  console.log("🚀 Starting super admin assignment...\n");

  try {
    // Step 1: Find the user by email
    console.log(`🔍 Looking up user: ${SUPER_ADMIN_EMAIL}`);
    const { data: users, error: userError } =
      await supabase.auth.admin.listUsers();

    if (userError) {
      console.error("❌ Error listing users:", userError.message);
      throw userError;
    }

    const user = users.users.find((u) => u.email === SUPER_ADMIN_EMAIL);

    if (!user) {
      console.error(`❌ User not found with email: ${SUPER_ADMIN_EMAIL}`);
      console.log("\nAvailable users:");
      users.users.forEach((u) => console.log(`  - ${u.email} (${u.id})`));
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email} (ID: ${user.id})\n`);

    // Step 2: Check if user is already a super admin
    console.log("🔍 Checking if user is already a super admin...");
    const { data: existingSuperAdmin, error: checkError } = await supabase
      .from("super_admin")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (existingSuperAdmin) {
      console.log("⚠️  User is already a super admin!");
      console.log(
        `   Granted at: ${new Date(existingSuperAdmin.granted_at).toLocaleString()}`
      );
      if (existingSuperAdmin.notes) {
        console.log(`   Notes: ${existingSuperAdmin.notes}`);
      }
      console.log("\n✅ No changes needed.\n");
      return;
    }

    // Step 3: Insert super admin record
    console.log("📝 Assigning super admin privileges...");
    const { data: newSuperAdmin, error: insertError } = await supabase
      .from("super_admin")
      .insert({
        user_id: user.id,
        granted_by: null, // Initial setup, no granter
        notes: "Platform owner - initial super admin assignment",
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Error assigning super admin:", insertError.message);
      throw insertError;
    }

    console.log("✅ Super admin assigned successfully!");
    console.log(`   User: ${user.email}`);
    console.log(`   User ID: ${user.id}`);
    console.log(
      `   Granted at: ${new Date(newSuperAdmin.granted_at).toLocaleString()}\n`
    );

    // Step 4: Verify the assignment
    console.log("🔍 Verifying super admin assignment...");
    const { data: verification, error: verifyError } = await supabase.rpc(
      "is_super_admin",
      { user_uuid: user.id }
    );

    if (verifyError) {
      console.error("❌ Error verifying super admin:", verifyError.message);
      throw verifyError;
    }

    if (verification) {
      console.log("✅ Verification successful! User is now a super admin.\n");
    } else {
      console.error(
        "❌ Verification failed! User is not recognized as super admin.\n"
      );
      process.exit(1);
    }

    // Step 5: Test org access
    console.log("🔍 Testing organization access...");
    const { data: orgs, error: orgError } = await supabase.rpc(
      "get_user_org_ids",
      { user_uuid: user.id }
    );

    if (orgError) {
      console.error("❌ Error getting org access:", orgError.message);
      throw orgError;
    }

    console.log(
      `✅ Super admin has access to ${orgs?.length || 0} organizations`
    );
    if (orgs && orgs.length > 0) {
      console.log("   Organizations:");
      const { data: orgDetails } = await supabase
        .from("org")
        .select("id, name")
        .in("id", orgs);
      orgDetails?.forEach((org) => console.log(`   - ${org.name} (${org.id})`));
    }

    console.log("\n✅ Super admin assignment complete!\n");
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

assignSuperAdmin();

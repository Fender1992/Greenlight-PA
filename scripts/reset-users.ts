#!/usr/bin/env tsx
/**
 * Script to reset all users in the database
 *
 * This script will:
 * 1. Delete all members from organizations
 * 2. Delete all organizations
 * 3. Delete all users from Supabase Auth
 *
 * WARNING: This is destructive and cannot be undone!
 *
 * Usage:
 *   npm run reset-users
 *
 * Or with confirmation skip:
 *   CONFIRM=yes npm run reset-users
 */

import { createClient } from "@supabase/supabase-js";
import * as readline from "readline";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing required environment variables:");
  console.error("   NEXT_PUBLIC_SUPABASE_URL");
  console.error("   SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function confirmAction(): Promise<boolean> {
  if (process.env.CONFIRM === "yes") {
    return true;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      "\n⚠️  WARNING: This will DELETE ALL USERS and related data!\n" +
        "This action CANNOT be undone.\n\n" +
        'Type "DELETE ALL USERS" to confirm: ',
      (answer) => {
        rl.close();
        resolve(answer.trim() === "DELETE ALL USERS");
      }
    );
  });
}

async function resetUsers() {
  console.log("🔍 Starting user reset process...\n");

  // Step 1: Get all users
  console.log("📋 Fetching all users from auth.users...");
  const { data: authData, error: authError } =
    await supabase.auth.admin.listUsers();

  if (authError) {
    console.error("❌ Error fetching users:", authError.message);
    process.exit(1);
  }

  const users = authData.users;
  console.log(`   Found ${users.length} user(s)\n`);

  if (users.length === 0) {
    console.log("✅ No users to delete. Database is already clean.");
    return;
  }

  // Confirm before proceeding
  const confirmed = await confirmAction();
  if (!confirmed) {
    console.log("\n❌ Reset cancelled by user.");
    process.exit(0);
  }

  console.log("\n🗑️  Starting deletion process...\n");

  // Step 2: Delete all members
  console.log("🗑️  Deleting all member records...");
  const { error: memberError } = await supabase
    .from("member")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (memberError) {
    console.error("❌ Error deleting members:", memberError.message);
  } else {
    console.log("   ✅ All members deleted\n");
  }

  // Step 3: Delete all organizations
  console.log("🗑️  Deleting all organizations...");
  const { error: orgError } = await supabase
    .from("org")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (orgError) {
    console.error("❌ Error deleting organizations:", orgError.message);
  } else {
    console.log("   ✅ All organizations deleted\n");
  }

  // Step 4: Delete all auth users
  console.log("🗑️  Deleting all auth users...");
  let deletedCount = 0;
  let failedCount = 0;

  for (const user of users) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      console.error(
        `   ❌ Failed to delete user ${user.email}: ${error.message}`
      );
      failedCount++;
    } else {
      console.log(`   ✅ Deleted user: ${user.email}`);
      deletedCount++;
    }
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 Reset Summary:");
  console.log(`   Total users found: ${users.length}`);
  console.log(`   Successfully deleted: ${deletedCount}`);
  console.log(`   Failed to delete: ${failedCount}`);
  console.log("=".repeat(50) + "\n");

  if (failedCount === 0) {
    console.log("✅ User reset completed successfully!");
  } else {
    console.log("⚠️  User reset completed with some errors.");
    process.exit(1);
  }
}

// Run the script
resetUsers().catch((error) => {
  console.error("\n❌ Unexpected error:", error);
  process.exit(1);
});

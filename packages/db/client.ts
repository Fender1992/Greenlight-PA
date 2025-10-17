/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * Package: @greenlight/db/client | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types/database";

// Validate environment variables
const supabaseUrl = process.env.NEXT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.NEXT_SUPABASE_ROLE_KEY;
const supabaseJwtSecret = process.env.NEXT_SUPABASE_JWT_SECRET;

if (!supabaseUrl) {
  throw new Error("Missing environment variable: NEXT_SUPABASE_URL");
}

if (!supabaseAnonKey) {
  throw new Error("Missing environment variable: NEXT_SUPABASE_ANON_KEY");
}

if (!supabaseServiceKey) {
  throw new Error("Missing environment variable: NEXT_SUPABASE_ROLE_KEY");
}

if (!supabaseJwtSecret) {
  throw new Error("Missing environment variable: NEXT_SUPABASE_JWT_SECRET");
}

/**
 * Client-side Supabase client (uses anon key + RLS)
 * Use this for all client-side and user-scoped operations
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Server-side Supabase client (uses service role key, bypasses RLS)
 * Use this ONLY for:
 * - Admin operations
 * - Background jobs
 * - Migrations
 * - Operations that need to bypass RLS
 *
 * SECURITY WARNING: Never use this client with user-provided input
 * without explicit validation
 */
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Helper: Get current user's org IDs
 */
export async function getUserOrgIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("member")
    .select("org_id")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user org IDs:", error);
    return [];
  }

  return data.map((m) => m.org_id);
}

/**
 * Helper: Check if user is admin of an org
 */
export async function isOrgAdmin(
  userId: string,
  orgId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("member")
    .select("role")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .eq("role", "admin")
    .single();

  return !error && data !== null;
}

/**
 * Helper: Get current authenticated user
 */
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Error fetching current user:", error);
    return null;
  }

  return user;
}

/**
 * Helper: Get current user's first org ID (convenience)
 */
export async function getCurrentUserOrgId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const orgIds = await getUserOrgIds(user.id);
  return orgIds.length > 0 ? orgIds[0] : null;
}

/**
 * Type guards and utilities
 */
export type SupabaseClient = typeof supabase;
export type SupabaseAdminClient = typeof supabaseAdmin;
export const SUPABASE_JWT_SECRET = supabaseJwtSecret;

export default supabase;

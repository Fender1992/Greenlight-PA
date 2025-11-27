/**
 * Shared helpers for API route handlers that need to resolve
 * the current user's organization context.
 */

import { supabaseAdmin, createScopedSupabase } from "@greenlight/db";
import type { User } from "@supabase/supabase-js";

/**
 * Check if a user is a super admin (has access to all organizations)
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("super_admin")
    .select("id")
    .eq("user_id", userId)
    .single();

  return !error && !!data;
}

/**
 * Custom error wrapper that allows API routes to throw and
 * capture an HTTP status together with a message.
 */
export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function extractAccessToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    for (const part of cookieHeader.split(";")) {
      const [rawName, ...rest] = part.trim().split("=");
      if (!rawName) continue;
      const name = rawName.trim();
      if (name === "sb-access-token") {
        return decodeURIComponent(rest.join("="));
      }
    }
  }

  return null;
}

/**
 * Ensures the request is authenticated and returns the Supabase user.
 */
export async function requireUser(
  request: Request
): Promise<{ user: User; token: string }> {
  const token = extractAccessToken(request);
  if (!token) {
    throw new HttpError(401, "Unauthorized");
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    throw new HttpError(401, "Unauthorized");
  }

  return { user: data.user, token };
}

/**
 * Resolves an organization id either from an explicit query parameter
 * or from the authenticated user's ACTIVE memberships.
 * Super admins have access to all organizations.
 *
 * For multi-org users, an org_id MUST be provided to avoid ambiguity.
 */
export async function resolveOrgId(
  user: User,
  providedOrgId: string | null,
  options: { allowAmbiguous?: boolean } = {}
): Promise<string> {
  // Check if user is a super admin
  const superAdmin = await isSuperAdmin(user.id);

  if (superAdmin) {
    // Super admins can access any organization
    if (providedOrgId) {
      // Verify the org exists
      const { data: org } = await supabaseAdmin
        .from("org")
        .select("id")
        .eq("id", providedOrgId)
        .single();

      if (!org) {
        throw new HttpError(404, "Organization not found");
      }
      return providedOrgId;
    }

    // For ambiguous cases (like auth status check), return first org
    if (options.allowAmbiguous) {
      const { data: orgs } = await supabaseAdmin
        .from("org")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1);

      if (orgs && orgs.length > 0) {
        return orgs[0].id;
      }
      throw new HttpError(404, "No organizations found in the system");
    }

    // Super admins MUST specify org_id for non-ambiguous operations
    throw new HttpError(
      400,
      "org_id parameter is required for super admin operations. Please specify the target organization using the org_id query parameter or in the request body."
    );
  }

  // Regular user - check active memberships
  const { data, error } = await supabaseAdmin
    .from("member")
    .select("org_id, status, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true }); // Deterministic ordering

  if (error) {
    console.error("Failed to fetch organization memberships", error);
    throw new HttpError(500, "Unable to resolve organization");
  }

  const memberships = data?.map((row) => row.org_id) ?? [];

  if (providedOrgId) {
    if (!memberships.includes(providedOrgId)) {
      throw new HttpError(
        403,
        "User does not have active access to this organization"
      );
    }
    return providedOrgId;
  }

  if (memberships.length === 0) {
    // Check if user has pending memberships
    const { data: pendingData } = await supabaseAdmin
      .from("member")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .limit(1);

    if (pendingData && pendingData.length > 0) {
      throw new HttpError(
        403,
        "Your membership is pending approval. Please wait for an admin to approve your request."
      );
    }

    throw new HttpError(404, "No active organization found for current user");
  }

  // Multi-org users must specify which org for admin operations
  if (memberships.length > 1 && !options.allowAmbiguous) {
    throw new HttpError(
      400,
      `org_id parameter is required. You have ${memberships.length} organization memberships. Please specify which organization using the org_id query parameter or in the request body.`
    );
  }

  // Return first membership (oldest) for single-org users or when ambiguous is allowed
  return memberships[0];
}

/**
 * Resolves the user's role in the given organization (must be ACTIVE member).
 * Super admins are returned as having 'super_admin' role.
 */
export async function resolveOrgRole(
  user: User,
  orgId: string
): Promise<"admin" | "staff" | "referrer" | "super_admin"> {
  // Check if user is a super admin first
  const superAdmin = await isSuperAdmin(user.id);
  if (superAdmin) {
    return "super_admin";
  }

  const { data, error } = await supabaseAdmin
    .from("member")
    .select("role, status")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .eq("status", "active") // Only active members
    .single();

  if (error || !data) {
    throw new HttpError(
      403,
      "User does not have active access to this organization"
    );
  }

  return data.role as "admin" | "staff" | "referrer";
}

export function getScopedClient(token: string) {
  return createScopedSupabase(token);
}

export async function getOrgContext(
  request: Request,
  providedOrgId: string | null,
  options: { allowAmbiguous?: boolean } = {}
) {
  const { user, token } = await requireUser(request);
  const orgId = await resolveOrgId(user, providedOrgId, options);
  const role = await resolveOrgRole(user, orgId);
  const client = getScopedClient(token);
  return { user, token, orgId, role, client };
}

/**
 * Requires the authenticated user to have admin role in a specific organization.
 * Throws 403 if user is not an admin. Super admins are allowed.
 *
 * IMPORTANT: For admin operations, org_id MUST be provided explicitly to ensure
 * the admin check is for the correct organization. This prevents multi-org admins
 * from accidentally performing admin actions on the wrong org.
 */
export async function requireOrgAdmin(
  request: Request,
  providedOrgId: string | null
) {
  // Admin operations should never be ambiguous - require explicit org
  const context = await getOrgContext(request, providedOrgId, {
    allowAmbiguous: false,
  });

  if (context.role !== "admin" && context.role !== "super_admin") {
    throw new HttpError(
      403,
      "This operation requires admin privileges in the organization"
    );
  }

  return context;
}

/**
 * Gets user's admin memberships across all organizations.
 * Returns array of org_ids where user has admin role.
 */
export async function getUserAdminOrgs(userId: string): Promise<string[]> {
  // Super admins are admin in all orgs
  if (await isSuperAdmin(userId)) {
    const { data: orgs } = await supabaseAdmin.from("org").select("id");
    return orgs?.map((o) => o.id) ?? [];
  }

  // Get all active admin memberships
  const { data } = await supabaseAdmin
    .from("member")
    .select("org_id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .eq("status", "active");

  return data?.map((m) => m.org_id) ?? [];
}

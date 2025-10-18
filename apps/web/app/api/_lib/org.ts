/**
 * Shared helpers for API route handlers that need to resolve
 * the current user's organization context.
 */

import { supabase as supabaseClient, supabaseAdmin } from "@greenlight/db";
import type { User } from "@supabase/supabase-js";

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
export async function requireUser(request: Request): Promise<User> {
  const token = extractAccessToken(request);
  if (!token) {
    throw new HttpError(401, "Unauthorized");
  }

  const { data, error } = await supabaseClient.auth.getUser(token);
  if (error || !data.user) {
    throw new HttpError(401, "Unauthorized");
  }

  return data.user;
}

/**
 * Resolves an organization id either from an explicit query parameter
 * or from the authenticated user's memberships.
 */
export async function resolveOrgId(user: User, providedOrgId: string | null) {
  const { data, error } = await supabaseAdmin
    .from("member")
    .select("org_id")
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to fetch organization memberships", error);
    throw new HttpError(500, "Unable to resolve organization");
  }

  const memberships = data?.map((row) => row.org_id) ?? [];

  if (providedOrgId) {
    if (!memberships.includes(providedOrgId)) {
      throw new HttpError(
        403,
        "User does not have access to this organization"
      );
    }
    return providedOrgId;
  }

  if (memberships.length === 0) {
    throw new HttpError(404, "No organization found for current user");
  }

  return memberships[0];
}

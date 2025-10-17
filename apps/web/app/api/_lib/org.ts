/**
 * Shared helpers for API route handlers that need to resolve
 * the current user's organization context.
 */

import {
  getCurrentUser,
  getCurrentUserOrgId,
  getUserOrgIds,
} from "@greenlight/db";

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

/**
 * Ensures the request is authenticated and returns the Supabase user.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new HttpError(401, "Unauthorized");
  }
  return user;
}

/**
 * Resolves an organization id either from an explicit query parameter
 * or from the authenticated user's memberships.
 */
export async function resolveOrgId(providedOrgId: string | null) {
  const user = await requireUser();

  if (providedOrgId) {
    const memberships = await getUserOrgIds(user.id);
    if (!memberships.includes(providedOrgId)) {
      throw new HttpError(
        403,
        "User does not have access to this organization"
      );
    }
    return providedOrgId;
  }

  const orgId = await getCurrentUserOrgId();
  if (!orgId) {
    throw new HttpError(404, "No organization found for current user");
  }

  return orgId;
}

/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Auth Status Check | Status: [Check STATUS.md] | Modified: 2025-10-24
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser, resolveOrgId } from "../../_lib/org";

/**
 * GET /api/auth/status
 *
 * Check if the authenticated user has active membership in an organization
 * Used by login flow to determine if user can access dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireUser(request);

    // Try to resolve org ID - allow ambiguous for multi-org users
    // This endpoint just checks if user has ANY active membership
    await resolveOrgId(user, null, { allowAmbiguous: true });

    // If we get here, user has active membership
    return NextResponse.json({
      success: true,
      status: "active",
    });
  } catch (error) {
    // Return the error message from org resolution
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unable to check status",
      },
      { status: 403 }
    );
  }
}

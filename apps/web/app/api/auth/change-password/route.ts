/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Change Password | Status: [Check STATUS.md] | Modified: 2025-10-24
 */

import { NextRequest, NextResponse } from "next/server";
import { createScopedSupabase } from "@greenlight/db";
import { HttpError, requireUser } from "../../_lib/org";

/**
 * POST /api/auth/change-password
 *
 * Allows authenticated users to change their password
 * Body: { currentPassword: string, newPassword: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Ensure user is authenticated
    const { user, token } = await requireUser(request);
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validate input
    if (!currentPassword || !newPassword) {
      throw new HttpError(400, "Both current and new password are required");
    }

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string"
    ) {
      throw new HttpError(400, "Passwords must be strings");
    }

    // Validate new password requirements
    if (newPassword.length < 8) {
      throw new HttpError(
        400,
        "New password must be at least 8 characters long"
      );
    }

    if (newPassword === currentPassword) {
      throw new HttpError(
        400,
        "New password must be different from current password"
      );
    }

    // Create a scoped client with the user's token
    const supabase = createScopedSupabase(token);

    // Step 1: Verify current password by attempting to sign in
    // This ensures the user knows their current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      throw new HttpError(401, "Current password is incorrect");
    }

    // Step 2: Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error("Password update error:", updateError);
      throw new HttpError(
        500,
        updateError.message || "Failed to update password"
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Change password error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to change password",
      },
      { status: 500 }
    );
  }
}

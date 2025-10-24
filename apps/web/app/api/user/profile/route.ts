/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: User Profile | Status: [Check STATUS.md] | Modified: 2025-10-24
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@greenlight/db/server";
import { supabaseAdmin } from "@greenlight/db";

/**
 * PATCH /api/user/profile
 *
 * Updates user's profile information (phone number and address)
 * Only allows updating phone_number and address fields
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { phoneNumber, address } = body;

    // Update member record with new phone number and address
    const { error: updateError } = await supabaseAdmin
      .from("member")
      .update({
        phone_number: phoneNumber,
        address: address,
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update profile",
      },
      { status: 500 }
    );
  }
}

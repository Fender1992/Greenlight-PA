/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: User Provisioning | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";

/**
 * POST /api/auth/provision
 *
 * Creates org and member records for newly signed up users
 * Called automatically after user signup to provision their organization
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { success: false, error: "Missing userId or email" },
        { status: 400 }
      );
    }

    // Check if user already has an org
    const { data: existingMember } = await supabaseAdmin
      .from("member")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existingMember) {
      // User already provisioned
      return NextResponse.json({
        success: true,
        message: "User already provisioned",
      });
    }

    // Create organization for the user
    const { data: org, error: orgError } = await supabaseAdmin
      .from("org")
      .insert({
        name: `Organization for ${email}`,
      })
      .select()
      .single();

    if (orgError || !org) {
      console.error("Error creating org:", orgError);
      return NextResponse.json(
        { success: false, error: "Failed to create organization" },
        { status: 500 }
      );
    }

    // Create member record linking user to org as admin
    const { error: memberError } = await supabaseAdmin.from("member").insert({
      org_id: org.id,
      user_id: userId,
      role: "admin",
    });

    if (memberError) {
      console.error("Error creating member:", memberError);
      // Try to clean up the org we just created
      await supabaseAdmin.from("org").delete().eq("id", org.id);
      return NextResponse.json(
        { success: false, error: "Failed to create member record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { orgId: org.id, userId },
    });
  } catch (error) {
    console.error("Provisioning error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Provisioning failed",
      },
      { status: 500 }
    );
  }
}

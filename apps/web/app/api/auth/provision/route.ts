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
    const { userId, email, orgId, role: requestedRole } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { success: false, error: "Missing userId or email" },
        { status: 400 }
      );
    }

    // Validate requested role
    const validRoles = ["admin", "staff", "referrer"];
    if (requestedRole && !validRoles.includes(requestedRole)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Check if user already has membership in any org
    const { data: existingMember } = await supabaseAdmin
      .from("member")
      .select("id, org_id, role")
      .eq("user_id", userId)
      .single();

    if (existingMember) {
      // User already provisioned - don't modify existing membership
      return NextResponse.json({
        success: true,
        message: "User already provisioned",
        data: {
          orgId: existingMember.org_id,
          role: existingMember.role,
        },
      });
    }

    // Determine if joining existing org or creating new one
    if (orgId) {
      // Joining existing organization
      // Verify org exists
      const { data: existingOrg } = await supabaseAdmin
        .from("org")
        .select("id")
        .eq("id", orgId)
        .single();

      if (!existingOrg) {
        return NextResponse.json(
          { success: false, error: "Organization not found" },
          { status: 404 }
        );
      }

      // Determine role for new member joining existing org
      // Default to staff, only allow admin if explicitly requested AND authorized
      let assignedRole: "admin" | "staff" | "referrer" = "staff";

      if (requestedRole === "admin") {
        // TODO: In future, validate that an existing admin invited this user
        // For now, prevent self-escalation to admin on existing orgs
        console.warn(
          `User ${userId} requested admin role for existing org ${orgId}, denied`
        );
        assignedRole = "staff";
      } else if (requestedRole === "referrer") {
        assignedRole = "referrer";
      }

      // Create member record for existing org
      const { error: memberError } = await supabaseAdmin.from("member").insert({
        org_id: orgId,
        user_id: userId,
        role: assignedRole,
      });

      if (memberError) {
        console.error("Error creating member:", memberError);
        return NextResponse.json(
          { success: false, error: "Failed to create member record" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: { orgId, userId, role: assignedRole },
      });
    } else {
      // Creating new organization - first user is always admin
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

      // First user in new org is always admin, regardless of requested role
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
        data: { orgId: org.id, userId, role: "admin" },
      });
    }
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

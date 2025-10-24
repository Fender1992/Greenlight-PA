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
    const {
      userId,
      email,
      orgId,
      orgName,
      role: requestedRole,
      createNew,
    } = body;

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
    const { data: existingMembers } = await supabaseAdmin
      .from("member")
      .select("id, org_id, role, status")
      .eq("user_id", userId);

    if (existingMembers && existingMembers.length > 0) {
      // User already has membership(s)
      const activeMember = existingMembers.find((m) => m.status === "active");
      const pendingMember = existingMembers.find((m) => m.status === "pending");

      if (activeMember) {
        // User has active membership
        return NextResponse.json({
          success: true,
          message: "User already provisioned",
          data: {
            orgId: activeMember.org_id,
            role: activeMember.role,
            status: "active",
          },
        });
      }

      if (pendingMember) {
        // User has pending membership
        return NextResponse.json({
          success: true,
          message: "Membership request pending approval",
          data: {
            orgId: pendingMember.org_id,
            role: pendingMember.role,
            status: "pending",
          },
        });
      }
    }

    // Determine if creating new org or joining existing one
    if (createNew) {
      // Creating new organization - first user is always admin with active status
      const newOrgName = orgName || `Organization for ${email}`;

      const { data: org, error: orgError } = await supabaseAdmin
        .from("org")
        .insert({
          name: newOrgName,
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

      // First user in new org is always admin with active status
      const { error: memberError } = await supabaseAdmin.from("member").insert({
        org_id: org.id,
        user_id: userId,
        role: "admin",
        status: "active", // Auto-approved for new org creator
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
        data: { orgId: org.id, userId, role: "admin", status: "active" },
        message: "New organization created successfully",
      });
    } else if (orgId) {
      // Joining existing organization - requires admin approval
      // Verify org exists
      const { data: existingOrg } = await supabaseAdmin
        .from("org")
        .select("id, name")
        .eq("id", orgId)
        .single();

      if (!existingOrg) {
        return NextResponse.json(
          { success: false, error: "Organization not found" },
          { status: 404 }
        );
      }

      // Determine role for new member joining existing org
      // Default to staff, prevent self-escalation to admin
      let assignedRole: "admin" | "staff" | "referrer" = "staff";

      if (requestedRole === "admin") {
        // Prevent self-escalation to admin on existing orgs
        console.warn(
          `User ${userId} requested admin role for existing org ${orgId}, denied`
        );
        assignedRole = "staff";
      } else if (requestedRole === "referrer") {
        assignedRole = "referrer";
      } else if (requestedRole === "staff") {
        assignedRole = "staff";
      }

      // Create member record with PENDING status (requires admin approval)
      const { error: memberError } = await supabaseAdmin.from("member").insert({
        org_id: orgId,
        user_id: userId,
        role: assignedRole,
        status: "pending", // Pending until admin approves
      });

      if (memberError) {
        console.error("Error creating member:", memberError);
        return NextResponse.json(
          { success: false, error: "Failed to create member request" },
          { status: 500 }
        );
      }

      // TODO: Send notification to org admins about pending request

      return NextResponse.json({
        success: true,
        data: { orgId, userId, role: assignedRole, status: "pending" },
        message:
          "Membership request submitted. An admin will review your request.",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Must provide either orgId or createNew=true",
        },
        { status: 400 }
      );
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

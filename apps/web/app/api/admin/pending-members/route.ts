/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Admin Pending Members | Status: [Check STATUS.md] | Modified: 2025-10-24
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";
import { HttpError, requireOrgAdmin } from "../../_lib/org";

/**
 * GET /api/admin/pending-members
 *
 * List all pending member requests for the organization
 * Admin-only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { orgId } = await requireOrgAdmin(
      request,
      searchParams.get("org_id")
    );

    // Get pending members with user email
    const { data, error } = await supabaseAdmin
      .from("member")
      .select(
        `
        id,
        user_id,
        role,
        status,
        created_at
      `
      )
      .eq("org_id", orgId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      throw new HttpError(500, error.message);
    }

    // Fetch user emails from auth.users for each pending member
    const membersWithEmails = await Promise.all(
      (data || []).map(async (member) => {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(
          member.user_id
        );
        return {
          ...member,
          email: userData.user?.email || "Unknown",
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: membersWithEmails,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Pending members fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch pending members",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/pending-members
 *
 * Approve or reject a pending member request
 * Body: { memberId: string, action: 'approve' | 'reject', role?: 'admin' | 'staff' | 'referrer' }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { orgId } = await requireOrgAdmin(
      request,
      searchParams.get("org_id")
    );
    const body = await request.json();
    const { memberId, action, role } = body;

    if (!memberId || !action) {
      throw new HttpError(400, "Missing memberId or action");
    }

    if (action !== "approve" && action !== "reject") {
      throw new HttpError(400, "Action must be 'approve' or 'reject'");
    }

    // Validate role if provided
    if (role && !["admin", "staff", "referrer"].includes(role)) {
      throw new HttpError(
        400,
        "Invalid role. Must be 'admin', 'staff', or 'referrer'"
      );
    }

    // Verify the member belongs to this org and is pending
    const { data: member, error: fetchError } = await supabaseAdmin
      .from("member")
      .select("*")
      .eq("id", memberId)
      .eq("org_id", orgId)
      .eq("status", "pending")
      .single();

    if (fetchError || !member) {
      throw new HttpError(404, "Pending member request not found");
    }

    if (action === "approve") {
      // Approve the member and optionally update role
      const updateData: { status: string; role?: string } = {
        status: "active",
      };
      if (role) {
        updateData.role = role;
      }

      const { data, error } = await supabaseAdmin
        .from("member")
        .update(updateData)
        .eq("id", memberId)
        .select()
        .single();

      if (error) {
        throw new HttpError(500, error.message);
      }

      // TODO: Send approval email notification

      return NextResponse.json({
        success: true,
        data,
        message: "Member approved successfully",
      });
    } else {
      // Reject the member (set status to rejected or delete)
      const { error } = await supabaseAdmin
        .from("member")
        .update({ status: "rejected" })
        .eq("id", memberId);

      if (error) {
        throw new HttpError(500, error.message);
      }

      // TODO: Send rejection email notification

      return NextResponse.json({
        success: true,
        message: "Member request rejected",
      });
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Pending member action error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process member request",
      },
      { status: 500 }
    );
  }
}

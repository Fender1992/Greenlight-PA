/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Super Admin Users | Status: [Check STATUS.md] | Modified: 2025-10-24
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";
import { HttpError, requireUser, isSuperAdmin } from "../../_lib/org";

/**
 * GET /api/super-admin/users
 *
 * Get all users across all organizations (super admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireUser(request);

    // Check if user is super admin
    const superAdmin = await isSuperAdmin(user.id);
    if (!superAdmin) {
      throw new HttpError(403, "Super admin access required");
    }

    // Get all members with organization info
    const { data: members, error: membersError } = await supabaseAdmin
      .from("member")
      .select("*, org:org_id(id, name)")
      .order("created_at", { ascending: false });

    if (membersError) {
      throw new HttpError(500, membersError.message);
    }

    // Get auth users info
    const { data: authUsers, error: authError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      throw new HttpError(500, authError.message);
    }

    // Merge member data with auth data
    const usersWithDetails = (members || []).map((member) => {
      const authUser = authUsers.users.find((u) => u.id === member.user_id);
      return {
        id: member.id,
        user_id: member.user_id,
        email: authUser?.email || "Unknown",
        role: member.role,
        status: member.status,
        org_id: member.org_id,
        org_name:
          (member.org as unknown as { id: string; name: string } | null)
            ?.name || "Unknown",
        created_at: member.created_at,
        last_sign_in: authUser?.last_sign_in_at || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: usersWithDetails,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Super admin users error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch users",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/super-admin/users
 *
 * Update user membership (role or status) (super admin only)
 * Body: { memberId: string, role?: string, status?: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user } = await requireUser(request);

    // Check if user is super admin
    const superAdmin = await isSuperAdmin(user.id);
    if (!superAdmin) {
      throw new HttpError(403, "Super admin access required");
    }

    const body = await request.json();
    const { memberId, role, status } = body;

    if (!memberId) {
      throw new HttpError(400, "memberId is required");
    }

    const updateData: { role?: string; status?: string } = {};
    if (role) {
      if (!["admin", "staff", "referrer"].includes(role)) {
        throw new HttpError(400, "Invalid role");
      }
      updateData.role = role;
    }
    if (status) {
      if (!["pending", "active", "rejected"].includes(status)) {
        throw new HttpError(400, "Invalid status");
      }
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      throw new HttpError(400, "No valid fields to update");
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

    return NextResponse.json({
      success: true,
      data,
      message: "User updated successfully",
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Super admin update user error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update user",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/super-admin/users?member_id=xxx
 *
 * Remove a user's membership from an organization (super admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await requireUser(request);

    // Check if user is super admin
    const superAdmin = await isSuperAdmin(user.id);
    if (!superAdmin) {
      throw new HttpError(403, "Super admin access required");
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("member_id");

    if (!memberId) {
      throw new HttpError(400, "member_id parameter required");
    }

    const { error } = await supabaseAdmin
      .from("member")
      .delete()
      .eq("id", memberId);

    if (error) {
      throw new HttpError(500, error.message);
    }

    return NextResponse.json({
      success: true,
      message: "User membership removed successfully",
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Super admin delete user error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove user membership",
      },
      { status: 500 }
    );
  }
}

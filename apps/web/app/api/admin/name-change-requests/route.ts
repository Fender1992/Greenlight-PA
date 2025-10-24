/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Admin Name Change Requests | Status: [Check STATUS.md] | Modified: 2025-10-24
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@greenlight/db/server";
import { supabaseAdmin } from "@greenlight/db";

/**
 * GET /api/admin/name-change-requests
 *
 * Get all pending name change requests for the admin's organization
 */
export async function GET(_request: NextRequest) {
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

    // Verify user is an admin
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from("member")
      .select("org_id, role")
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberData || memberData.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get all name change requests for this org
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from("name_change_request")
      .select(
        `
        *,
        member:member_id (
          id,
          first_name,
          last_name,
          user_id
        ),
        reviewer:reviewed_by (
          id,
          first_name,
          last_name
        )
      `
      )
      .eq("org_id", memberData.org_id)
      .order("created_at", { ascending: false });

    if (requestsError) {
      console.error("Error fetching requests:", requestsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch name change requests" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: requests || [],
    });
  } catch (error) {
    console.error("Name change requests fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch name change requests",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/name-change-requests
 *
 * Approve or deny a name change request
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

    // Verify user is an admin
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from("member")
      .select("id, org_id, role")
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberData || memberData.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { requestId, action, denialReason } = body;

    if (!requestId || !action || !["approve", "deny"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid request parameters" },
        { status: 400 }
      );
    }

    if (action === "deny" && !denialReason) {
      return NextResponse.json(
        { success: false, error: "Denial reason is required" },
        { status: 400 }
      );
    }

    // Get the name change request
    const { data: nameChangeRequest, error: fetchError } = await supabaseAdmin
      .from("name_change_request")
      .select("*, member:member_id (id, user_id)")
      .eq("id", requestId)
      .eq("org_id", memberData.org_id)
      .single();

    if (fetchError || !nameChangeRequest) {
      return NextResponse.json(
        { success: false, error: "Name change request not found" },
        { status: 404 }
      );
    }

    if (nameChangeRequest.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: "This request has already been processed",
        },
        { status: 400 }
      );
    }

    // Update the request status
    const { error: updateRequestError } = await supabaseAdmin
      .from("name_change_request")
      .update({
        status: action === "approve" ? "approved" : "denied",
        reviewed_by: memberData.id,
        reviewed_at: new Date().toISOString(),
        denial_reason: action === "deny" ? denialReason : null,
      })
      .eq("id", requestId);

    if (updateRequestError) {
      console.error("Error updating request:", updateRequestError);
      return NextResponse.json(
        { success: false, error: "Failed to update name change request" },
        { status: 500 }
      );
    }

    // If approved, update the member's name
    if (action === "approve") {
      const { error: updateMemberError } = await supabaseAdmin
        .from("member")
        .update({
          first_name: nameChangeRequest.requested_first_name,
          last_name: nameChangeRequest.requested_last_name,
        })
        .eq("id", nameChangeRequest.member_id);

      if (updateMemberError) {
        console.error("Error updating member name:", updateMemberError);
        return NextResponse.json(
          { success: false, error: "Failed to update member name" },
          { status: 500 }
        );
      }
    }

    // Create notification for the user
    const notificationMessage =
      action === "approve"
        ? `Your name change request has been approved. Your name has been updated to ${nameChangeRequest.requested_first_name} ${nameChangeRequest.requested_last_name}.`
        : `Your name change request has been denied. Reason: ${denialReason}`;

    await supabaseAdmin.from("notification").insert({
      user_id: nameChangeRequest.member.user_id,
      org_id: memberData.org_id,
      type:
        action === "approve" ? "name_change_approved" : "name_change_denied",
      title:
        action === "approve"
          ? "Name Change Approved"
          : "Name Change Request Denied",
      message: notificationMessage,
      link: "/dashboard/preferences",
      metadata: {
        request_id: requestId,
        action,
        old_name: `${nameChangeRequest.current_first_name} ${nameChangeRequest.current_last_name}`,
        new_name: `${nameChangeRequest.requested_first_name} ${nameChangeRequest.requested_last_name}`,
      },
      read: false,
    });

    return NextResponse.json({
      success: true,
      message: `Name change request ${action === "approve" ? "approved" : "denied"} successfully`,
    });
  } catch (error) {
    console.error("Name change request update error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process name change request",
      },
      { status: 500 }
    );
  }
}

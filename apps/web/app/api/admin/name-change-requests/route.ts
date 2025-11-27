/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Admin Name Change Requests | Status: ENABLED | Modified: 2025-11-27
 *
 * ENABLED: Manages name change requests for organization admins
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";
import { HttpError, requireOrgAdmin } from "../../_lib/org";

/**
 * GET /api/admin/name-change-requests
 *
 * List all name change requests for the organization
 * Admin-only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { orgId } = await requireOrgAdmin(
      request,
      searchParams.get("org_id")
    );

    // Get name change requests for this organization
    const { data, error } = await supabaseAdmin
      .from("name_change_request")
      .select(
        `
        id,
        member_id,
        org_id,
        current_first_name,
        current_last_name,
        requested_first_name,
        requested_last_name,
        status,
        reviewed_by,
        reviewed_at,
        denial_reason,
        created_at,
        updated_at
      `
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new HttpError(500, error.message);
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

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
 * Body: { requestId: string, action: 'approve' | 'deny', denialReason?: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { orgId, user } = await requireOrgAdmin(
      request,
      searchParams.get("org_id")
    );
    const body = await request.json();
    const { requestId, action, denialReason } = body;

    if (!requestId || !action) {
      throw new HttpError(400, "Missing requestId or action");
    }

    if (action !== "approve" && action !== "deny") {
      throw new HttpError(400, "Action must be 'approve' or 'deny'");
    }

    if (action === "deny" && !denialReason) {
      throw new HttpError(400, "Denial reason is required when denying a request");
    }

    // Verify the request belongs to this org and is pending
    const { data: nameChangeRequest, error: fetchError } = await supabaseAdmin
      .from("name_change_request")
      .select("*")
      .eq("id", requestId)
      .eq("org_id", orgId)
      .eq("status", "pending")
      .single();

    if (fetchError || !nameChangeRequest) {
      throw new HttpError(404, "Pending name change request not found");
    }

    if (action === "approve") {
      // Approve the name change request
      const updateData = {
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from("name_change_request")
        .update(updateData)
        .eq("id", requestId)
        .select()
        .single();

      if (error) {
        throw new HttpError(500, error.message);
      }

      // TODO: Update member record with new name
      // TODO: Send approval notification

      return NextResponse.json({
        success: true,
        data,
        message: "Name change request approved successfully",
      });
    } else {
      // Deny the name change request
      const updateData = {
        status: "denied",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        denial_reason: denialReason,
      };

      const { data, error } = await supabaseAdmin
        .from("name_change_request")
        .update(updateData)
        .eq("id", requestId)
        .select()
        .single();

      if (error) {
        throw new HttpError(500, error.message);
      }

      // TODO: Send denial notification

      return NextResponse.json({
        success: true,
        data,
        message: "Name change request denied",
      });
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Name change request action error:", error);
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

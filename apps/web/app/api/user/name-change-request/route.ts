/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Name Change Request | Status: ENABLED | Modified: 2025-11-27
 *
 * ENABLED: Allows users to create and view their name change requests
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";
import { HttpError, requireUser, resolveOrgId } from "../../_lib/org";

/**
 * GET /api/user/name-change-request
 *
 * Get user's own name change requests
 * Optionally filter by org_id
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireUser(request);
    const { searchParams } = new URL(request.url);
    const providedOrgId = searchParams.get("org_id");

    // Get user's member records to find org associations
    const { data: members, error: memberError } = await supabaseAdmin
      .from("member")
      .select("id, org_id")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (memberError) {
      throw new HttpError(500, memberError.message);
    }

    if (!members || members.length === 0) {
      throw new HttpError(404, "No active organization found for current user");
    }

    const memberIds = members.map((m) => m.id);

    // Build query for name change requests
    let query = supabaseAdmin
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
      .in("member_id", memberIds)
      .order("created_at", { ascending: false });

    // Filter by org if provided
    if (providedOrgId) {
      query = query.eq("org_id", providedOrgId);
    }

    const { data, error } = await query;

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
 * POST /api/user/name-change-request
 *
 * Create a new name change request
 * Body: { requestedFirstName: string, requestedLastName: string, org_id?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireUser(request);
    const body = await request.json();
    const { requestedFirstName, requestedLastName, org_id } = body;

    if (!requestedFirstName || !requestedLastName) {
      throw new HttpError(
        400,
        "Missing required fields: requestedFirstName, requestedLastName"
      );
    }

    // Resolve which org this request is for
    const orgId = await resolveOrgId(user, org_id || null, {
      allowAmbiguous: true,
    });

    // Get user's member record for this org
    const { data: member, error: memberError } = await supabaseAdmin
      .from("member")
      .select("id, first_name, last_name")
      .eq("user_id", user.id)
      .eq("org_id", orgId)
      .eq("status", "active")
      .single();

    if (memberError || !member) {
      throw new HttpError(
        404,
        "No active membership found for this organization"
      );
    }

    // Check if there's already a pending request for this member
    const { data: existingRequest } = await supabaseAdmin
      .from("name_change_request")
      .select("id")
      .eq("member_id", member.id)
      .eq("status", "pending")
      .single();

    if (existingRequest) {
      throw new HttpError(
        409,
        "You already have a pending name change request. Please wait for it to be reviewed."
      );
    }

    // Create the name change request
    const { data, error } = await supabaseAdmin
      .from("name_change_request")
      .insert({
        member_id: member.id,
        org_id: orgId,
        current_first_name: member.first_name,
        current_last_name: member.last_name,
        requested_first_name: requestedFirstName,
        requested_last_name: requestedLastName,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      throw new HttpError(500, error.message);
    }

    // TODO: Send notification to org admins

    return NextResponse.json({
      success: true,
      data,
      message: "Name change request submitted successfully",
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Name change request creation error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create name change request",
      },
      { status: 500 }
    );
  }
}

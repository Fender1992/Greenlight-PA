/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Name Change Request | Status: [Check STATUS.md] | Modified: 2025-10-24
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@greenlight/db/server";
import { supabaseAdmin } from "@greenlight/db";

/**
 * POST /api/user/name-change-request
 *
 * Creates a name change request for admin review
 * Stores the request in a dedicated table and creates a notification for org admins
 */
export async function POST(request: NextRequest) {
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
    const { firstName, lastName } = body;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: "First name and last name are required" },
        { status: 400 }
      );
    }

    // Get user's member record to find their org
    const { data: memberData, error: memberError } = await supabaseAdmin
      .from("member")
      .select("id, org_id, first_name, last_name")
      .eq("user_id", user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { success: false, error: "Member record not found" },
        { status: 404 }
      );
    }

    // Check if there's already a pending request
    const { data: existingRequest } = await supabaseAdmin
      .from("name_change_request")
      .select("id")
      .eq("member_id", memberData.id)
      .eq("status", "pending")
      .single();

    if (existingRequest) {
      return NextResponse.json(
        {
          success: false,
          error: "You already have a pending name change request",
        },
        { status: 400 }
      );
    }

    // Create name change request
    const { data: requestData, error: requestError } = await supabaseAdmin
      .from("name_change_request")
      .insert({
        member_id: memberData.id,
        org_id: memberData.org_id,
        current_first_name: memberData.first_name,
        current_last_name: memberData.last_name,
        requested_first_name: firstName,
        requested_last_name: lastName,
        status: "pending",
      })
      .select()
      .single();

    if (requestError || !requestData) {
      console.error("Error creating name change request:", requestError);
      return NextResponse.json(
        { success: false, error: "Failed to create name change request" },
        { status: 500 }
      );
    }

    // Get all admins in the org to notify them
    const { data: admins } = await supabaseAdmin
      .from("member")
      .select("user_id")
      .eq("org_id", memberData.org_id)
      .eq("role", "admin")
      .eq("status", "active");

    // Create notifications for all org admins
    if (admins && admins.length > 0) {
      const notifications = admins.map((admin) => ({
        user_id: admin.user_id,
        org_id: memberData.org_id,
        type: "name_change_request",
        title: "Name Change Request",
        message: `${memberData.first_name} ${memberData.last_name} has requested to change their name to ${firstName} ${lastName}`,
        link: "/dashboard/admin?tab=name-changes",
        metadata: {
          request_id: requestData.id,
          member_id: memberData.id,
          current_name: `${memberData.first_name} ${memberData.last_name}`,
          requested_name: `${firstName} ${lastName}`,
        },
        read: false,
      }));

      await supabaseAdmin.from("notification").insert(notifications);
    }

    return NextResponse.json({
      success: true,
      message: "Name change request submitted successfully",
      data: { request_id: requestData.id },
    });
  } catch (error) {
    console.error("Name change request error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit name change request",
      },
      { status: 500 }
    );
  }
}

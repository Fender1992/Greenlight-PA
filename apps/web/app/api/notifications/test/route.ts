/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Test Notifications | Status: Development Only | Modified: 2025-10-24
 *
 * Creates test notifications for development/testing purposes
 * Remove or disable in production
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";
import { HttpError, requireUser } from "../../_lib/org";

/**
 * POST /api/notifications/test
 *
 * Create test notifications for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireUser(request);

    const testNotifications = [
      {
        user_id: user.id,
        type: "pa_request_approved",
        title: "PA Request Approved",
        message: "Your PA request for John Doe has been approved by the payer.",
        link: "/dashboard/pa/test-id-1",
        read: false,
      },
      {
        user_id: user.id,
        type: "pa_request_denied",
        title: "PA Request Denied",
        message: "PA request for Jane Smith requires additional information.",
        link: "/dashboard/pa/test-id-2",
        read: false,
      },
      {
        user_id: user.id,
        type: "member_approved",
        title: "New Member Approved",
        message:
          "Dr. Sarah Johnson has been approved and added to your organization.",
        link: "/dashboard/admin",
        read: true,
      },
      {
        user_id: user.id,
        type: "system_notification",
        title: "System Maintenance Scheduled",
        message:
          "Greenlight PA will undergo maintenance this Sunday at 2 AM EST.",
        link: null,
        read: false,
      },
      {
        user_id: user.id,
        type: "urgent",
        title: "Urgent: Expiring Authorization",
        message: "Authorization for Patient Robert Brown expires in 48 hours.",
        link: "/dashboard/pa/test-id-3",
        read: false,
      },
    ];

    const { data, error } = await supabaseAdmin
      .from("notification")
      .insert(testNotifications)
      .select();

    if (error) {
      console.error("Error creating test notifications:", error);
      throw new HttpError(500, "Failed to create test notifications");
    }

    return NextResponse.json({
      success: true,
      data,
      message: `Created ${data.length} test notifications`,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Test notifications error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create test notifications",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/test
 *
 * Delete all notifications for the authenticated user (cleanup)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await requireUser(request);

    const { error } = await supabaseAdmin
      .from("notification")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting test notifications:", error);
      throw new HttpError(500, "Failed to delete test notifications");
    }

    return NextResponse.json({
      success: true,
      message: "All notifications deleted",
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Delete test notifications error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete test notifications",
      },
      { status: 500 }
    );
  }
}

/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Notifications | Status: [Check STATUS.md] | Modified: 2025-10-24
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";
import { HttpError, requireUser } from "../_lib/org";

/**
 * GET /api/notifications
 *
 * Get all notifications for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireUser(request);

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread_only") === "true";

    let query = supabaseAdmin
      .from("notification")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (unreadOnly) {
      query = query.eq("read", false);
    }

    const { data: notifications, error: notificationsError } = await query;

    if (notificationsError) {
      console.error("Error fetching notifications:", notificationsError);
      throw new HttpError(500, "Failed to fetch notifications");
    }

    return NextResponse.json({
      success: true,
      data: notifications || [],
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Notifications fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch notifications",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 *
 * Mark notification(s) as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user } = await requireUser(request);
    const body = await request.json();
    const { notificationId, markAllAsRead } = body;

    if (markAllAsRead) {
      // Mark all notifications as read for this user
      const { error: updateError } = await supabaseAdmin
        .from("notification")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (updateError) {
        console.error("Error marking all notifications as read:", updateError);
        throw new HttpError(500, "Failed to mark notifications as read");
      }

      return NextResponse.json({
        success: true,
        message: "All notifications marked as read",
      });
    } else if (notificationId) {
      // Mark single notification as read
      const { error: updateError } = await supabaseAdmin
        .from("notification")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Error marking notification as read:", updateError);
        throw new HttpError(500, "Failed to mark notification as read");
      }

      return NextResponse.json({
        success: true,
        message: "Notification marked as read",
      });
    } else {
      throw new HttpError(400, "Must provide notificationId or markAllAsRead");
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Notification update error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update notification",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications
 *
 * Delete a notification
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await requireUser(request);
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");

    if (!notificationId) {
      throw new HttpError(400, "Notification ID is required");
    }

    const { error: deleteError } = await supabaseAdmin
      .from("notification")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting notification:", deleteError);
      throw new HttpError(500, "Failed to delete notification");
    }

    return NextResponse.json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Notification delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete notification",
      },
      { status: 500 }
    );
  }
}

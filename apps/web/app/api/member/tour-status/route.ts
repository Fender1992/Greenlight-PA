/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Member Tour Status | Status: [Check STATUS.md] | Modified: 2025-10-20
 */

import { NextRequest, NextResponse } from "next/server";
import { getScopedClient, requireUser } from "../../_lib/org";

/**
 * GET /api/member/tour-status
 *
 * Retrieves the tour status for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const { user, token } = await requireUser(req);
    const client = getScopedClient(token);

    // Get member record with tour status
    const { data: member, error: memberError } = await client
      .from("member")
      .select("has_seen_tour")
      .eq("user_id", user.id)
      .single();

    if (memberError) {
      console.error("[Tour Status] Error fetching member:", memberError);
      // Return false if member not found (graceful degradation)
      if (memberError.code === "PGRST116") {
        return NextResponse.json({
          success: true,
          data: { has_seen_tour: false },
        });
      }
      return NextResponse.json(
        { error: "Failed to fetch tour status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        has_seen_tour: member?.has_seen_tour ?? false,
      },
    });
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.message.includes("unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("[Tour Status] Unexpected error in GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/member/tour-status
 *
 * Marks the tour as seen for the authenticated user
 */
export async function POST(req: NextRequest) {
  try {
    const { user, token } = await requireUser(req);
    const client = getScopedClient(token);

    // Update member record to mark tour as seen
    const { error: updateError } = await client
      .from("member")
      .update({ has_seen_tour: true })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[Tour Status] Error updating tour status:", updateError);
      return NextResponse.json(
        { error: "Failed to update tour status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tour status updated successfully",
    });
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.message.includes("unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("[Tour Status] Unexpected error in POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Reject unsupported methods
 */
export async function PUT() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: { Allow: "GET, POST" } }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: { Allow: "GET, POST" } }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405, headers: { Allow: "GET, POST" } }
  );
}

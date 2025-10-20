/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Member Tour Status | Status: [Check STATUS.md] | Modified: 2025-10-20
 */

import { NextRequest, NextResponse } from "next/server";
import { getScopedClient, requireUser } from "../../_lib/org";

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
      console.error("Error fetching member tour status:", memberError);
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
    console.error("Unexpected error in tour-status GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
      console.error("Error updating tour status:", updateError);
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
    console.error("Unexpected error in tour-status POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

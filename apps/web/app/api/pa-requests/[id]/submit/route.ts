/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: PA Request Submission | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  supabase,
  updatePARequestStatus,
} from "@greenlight/db";

/**
 * POST /api/pa-requests/[id]/submit
 * Submit PA request (draft → submitted)
 *
 * Validates:
 * - All required checklist items are attached or waived
 * - Medical necessity summary exists
 * - PA is in 'draft' status
 *
 * Body: {}
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;

    // Get PA request
    const { data: paRequest, error: paError } = await supabase
      .from("pa_request")
      .select("*")
      .eq("id", id)
      .single();

    if (paError || !paRequest) {
      return NextResponse.json(
        { success: false, error: "PA request not found" },
        { status: 404 }
      );
    }

    // Check if already submitted
    if (paRequest.status !== "draft") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot submit PA in '${paRequest.status}' status. Must be 'draft'.`,
        },
        { status: 400 }
      );
    }

    // Validate checklist items
    const { data: checklistItems, error: checklistError } = await supabase
      .from("pa_checklist_item")
      .select("*")
      .eq("pa_request_id", id);

    if (checklistError) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch checklist items" },
        { status: 500 }
      );
    }

    // Check if all required items have evidence
    const incompleteItems = checklistItems?.filter(
      (item) =>
        item.required_bool &&
        item.status !== "attached" &&
        item.status !== "waived"
    );

    if (incompleteItems && incompleteItems.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot submit: ${incompleteItems.length} required checklist item(s) incomplete`,
          incomplete_items: incompleteItems.map((i) => ({
            id: i.id,
            name: i.name,
          })),
        },
        { status: 400 }
      );
    }

    // Validate medical necessity summary exists
    const { data: summaries, error: summaryError } = await supabase
      .from("pa_summary")
      .select("*")
      .eq("pa_request_id", id)
      .order("version", { ascending: false })
      .limit(1);

    if (summaryError || !summaries || summaries.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot submit: Medical necessity summary required",
        },
        { status: 400 }
      );
    }

    // Update status to 'submitted'
    const result = await updatePARequestStatus(
      id,
      "submitted",
      "PA request submitted for review"
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Update submitted_at timestamp
    const { error: timestampError } = await supabase
      .from("pa_request")
      .update({ submitted_at: new Date().toISOString() })
      .eq("id", id);

    if (timestampError) {
      console.error("Failed to update submitted_at:", timestampError);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result.data,
        submitted_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("PA request submission error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

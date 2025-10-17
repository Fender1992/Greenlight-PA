/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Single PA Request | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUser,
  getPARequestById,
  updatePARequestStatus,
} from "@greenlight/db";
import { supabase } from "@greenlight/db";
import type { Database } from "@greenlight/db/types/database";

type PAStatus = Database["public"]["Enums"]["pa_status"];
type PaRequestRow = Database["public"]["Tables"]["pa_request"]["Row"];
type PaRequestUpdate = Partial<Pick<PaRequestRow, "priority">>;

const PRIORITIES: ReadonlyArray<PaRequestRow["priority"]> = [
  "standard",
  "urgent",
];

/**
 * GET /api/pa-requests/[id]
 * Get single PA request with full details
 */
export async function GET(
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
    const result = await getPARequestById(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error("PA request get error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pa-requests/[id]
 * Update PA request (status or fields)
 *
 * Body:
 * {
 *   status?: pa_status,
 *   note?: string,  // for status changes
 *   priority?: 'standard' | 'urgent'
 * }
 */
export async function PATCH(
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
    const body = await request.json();
    const {
      status,
      note,
      priority,
    }: {
      status?: string;
      note?: string;
      priority?: PaRequestRow["priority"];
    } = body;

    // If status is being updated, use updatePARequestStatus helper
    if (status) {
      const result = await updatePARequestStatus(id, status as PAStatus, note);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, data: result.data });
    }

    // Otherwise, update other fields directly
    const updates: PaRequestUpdate = {};
    if (priority) {
      if (!PRIORITIES.includes(priority)) {
        return NextResponse.json(
          { success: false, error: "Invalid priority value" },
          { status: 400 }
        );
      }
      updates.priority = priority;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("pa_request")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const updated = await getPARequestById(id);
    if (!updated.success) {
      return NextResponse.json(
        { success: false, error: updated.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: updated.data });
  } catch (error) {
    console.error("PA request update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pa-requests/[id]
 * Delete PA request (cascade deletes related data)
 */
export async function DELETE(
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

    const { error } = await supabase.from("pa_request").delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id, deleted: true },
    });
  } catch (error) {
    console.error("PA request delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

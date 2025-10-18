/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Single PA Request | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@greenlight/db";
import type { Database } from "@greenlight/db/types/database";
import { HttpError, requireUser, resolveOrgId } from "../../_lib/org";

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
    const { id } = params;
    const { user } = await requireUser(request);

    const { data, error } = await supabaseAdmin
      .from("pa_request")
      .select(
        `
        *,
        order:order_id(
          *,
          patient:patient_id(*),
          provider:provider_id(*)
        ),
        payer:payer_id(*),
        checklist_items:pa_checklist_item(*),
        summaries:pa_summary(*),
        status_events:status_event(*)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { success: false, error: "PA request not found" },
          { status: 404 }
        );
      }
      throw new HttpError(500, error.message);
    }

    await resolveOrgId(user, data.org_id);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

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

    const { data: paRecord, error: fetchError } = await supabaseAdmin
      .from("pa_request")
      .select("org_id")
      .eq("id", id)
      .single();

    if (fetchError || !paRecord) {
      throw new HttpError(404, "PA request not found");
    }

    const { user } = await requireUser(request);
    await resolveOrgId(user, paRecord.org_id);

    // If status is being updated, handle via service role client
    if (status) {
      const { data: updated, error: statusError } = await supabaseAdmin
        .from("pa_request")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (statusError || !updated) {
        throw new HttpError(
          500,
          statusError?.message || "Status update failed"
        );
      }

      const { error: eventError } = await supabaseAdmin
        .from("status_event")
        .insert({
          pa_request_id: id,
          status,
          note,
          actor: user.id,
        });

      if (eventError) {
        console.error("Failed to create status event:", eventError);
      }

      return NextResponse.json({ success: true, data: updated });
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

    const { error } = await supabaseAdmin
      .from("pa_request")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const { data: updated, error: refetchError } = await supabaseAdmin
      .from("pa_request")
      .select(
        `
        *,
        order:order_id(
          *,
          patient:patient_id(*),
          provider:provider_id(*)
        ),
        payer:payer_id(*),
        checklist_items:pa_checklist_item(*),
        summaries:pa_summary(*),
        status_events:status_event(*)
      `
      )
      .eq("id", id)
      .single();

    if (refetchError || !updated) {
      throw new HttpError(500, refetchError?.message || "Failed to fetch PA");
    }

    return NextResponse.json({ success: true, data: updated });
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
    const { id } = params;
    const { data: paRecord, error: fetchError } = await supabaseAdmin
      .from("pa_request")
      .select("org_id")
      .eq("id", id)
      .single();

    if (fetchError || !paRecord) {
      throw new HttpError(404, "PA request not found");
    }

    const { user } = await requireUser(request);
    await resolveOrgId(user, paRecord.org_id);

    const { error } = await supabaseAdmin
      .from("pa_request")
      .delete()
      .eq("id", id);

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
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

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

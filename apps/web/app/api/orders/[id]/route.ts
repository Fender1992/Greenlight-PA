/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Single Order | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getOrderById, supabase } from "@greenlight/db";
import type { Database } from "@greenlight/db";

type OrderRow = Database["public"]["Tables"]["order"]["Row"];
type OrderUpdate = Partial<
  Pick<OrderRow, "modality" | "cpt_codes" | "icd10_codes" | "clinic_notes_text">
>;

/**
 * GET /api/orders/[id]
 * Get single order with patient and provider details
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
    const result = await getOrderById(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error("Order get error:", error);
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
 * PATCH /api/orders/[id]
 * Update order fields
 *
 * Body:
 * {
 *   modality?: string,
 *   cpt_codes?: string[],
 *   icd10_codes?: string[],
 *   clinic_notes_text?: string
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
      modality,
      cpt_codes,
      icd10_codes,
      clinic_notes_text,
    }: {
      modality?: OrderRow["modality"];
      cpt_codes?: OrderRow["cpt_codes"];
      icd10_codes?: OrderRow["icd10_codes"];
      clinic_notes_text?: OrderRow["clinic_notes_text"];
    } = body;

    const updates: OrderUpdate = {};
    if (modality) updates.modality = modality;
    if (cpt_codes) {
      if (!Array.isArray(cpt_codes)) {
        return NextResponse.json(
          { success: false, error: "cpt_codes must be an array" },
          { status: 400 }
        );
      }
      updates.cpt_codes = cpt_codes;
    }
    if (icd10_codes) {
      if (!Array.isArray(icd10_codes)) {
        return NextResponse.json(
          { success: false, error: "icd10_codes must be an array" },
          { status: 400 }
        );
      }
      updates.icd10_codes = icd10_codes;
    }
    if (clinic_notes_text !== undefined) {
      updates.clinic_notes_text = clinic_notes_text;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("order")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const updated = await getOrderById(id);
    if (!updated.success) {
      return NextResponse.json(
        { success: false, error: updated.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: updated.data });
  } catch (error) {
    console.error("Order update error:", error);
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
 * DELETE /api/orders/[id]
 * Delete order (will fail if PA requests exist due to foreign key)
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

    const { error } = await supabase.from("order").delete().eq("id", id);

    if (error) {
      // Check if it's a foreign key constraint error
      if (error.message.includes("foreign key")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Cannot delete order: PA requests exist for this order. Delete them first.",
          },
          { status: 400 }
        );
      }
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
    console.error("Order delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

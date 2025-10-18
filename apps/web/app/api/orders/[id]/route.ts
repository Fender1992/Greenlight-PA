/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Single Order | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@greenlight/db/types/database";
import { HttpError, getScopedClient, requireUser } from "../../_lib/org";

type OrderRow = Database["public"]["Tables"]["order"]["Row"];
type OrderUpdate = Partial<
  Pick<OrderRow, "modality" | "cpt_codes" | "icd10_codes" | "clinic_notes_text">
>;

type ScopedClient = SupabaseClient<Database>;

const ORDER_SELECT = `
  *,
  patient:patient_id(*),
  provider:provider_id(*)
`;

async function fetchOrderWithRelations(client: ScopedClient, id: string) {
  return client.from("order").select(ORDER_SELECT).eq("id", id).single();
}

function validateCodeArray(
  value: unknown,
  field: "cpt_codes" | "icd10_codes"
): asserts value is string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new HttpError(400, `${field} must be an array of strings`);
  }
}

/**
 * GET /api/orders/[id]
 * Get single order with patient and provider details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { token } = await requireUser(request);
    const client = getScopedClient(token);
    const { data, error } = await fetchOrderWithRelations(client, params.id);

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { success: false, error: "Order not found" },
          { status: 404 }
        );
      }
      throw new HttpError(500, error.message);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const status =
      error instanceof HttpError ? error.status : /* default */ 500;
    const message =
      error instanceof HttpError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Internal server error";

    if (!(error instanceof HttpError)) {
      console.error("Order get error:", error);
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
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
    const { token } = await requireUser(request);
    const client = getScopedClient(token);
    const { id } = params;

    const body = await request.json();
    const updates: OrderUpdate = {};

    if (body.modality !== undefined) {
      updates.modality = body.modality;
    }

    if (body.cpt_codes !== undefined) {
      validateCodeArray(body.cpt_codes, "cpt_codes");
      updates.cpt_codes = body.cpt_codes;
    }

    if (body.icd10_codes !== undefined) {
      validateCodeArray(body.icd10_codes, "icd10_codes");
      updates.icd10_codes = body.icd10_codes;
    }

    if (body.clinic_notes_text !== undefined) {
      updates.clinic_notes_text = body.clinic_notes_text;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    const { error } = await client
      .from("order")
      .update(updates)
      .eq("id", id)
      .select("id")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { success: false, error: "Order not found" },
          { status: 404 }
        );
      }
      throw new HttpError(500, error.message);
    }

    const { data: refreshed, error: refetchError } =
      await fetchOrderWithRelations(client, id);

    if (refetchError || !refreshed) {
      throw new HttpError(500, refetchError?.message || "Failed to load order");
    }

    return NextResponse.json({ success: true, data: refreshed });
  } catch (error) {
    const status =
      error instanceof HttpError ? error.status : /* default */ 500;
    const message =
      error instanceof HttpError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Internal server error";

    if (!(error instanceof HttpError)) {
      console.error("Order update error:", error);
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
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
    const { token } = await requireUser(request);
    const client = getScopedClient(token);
    const { id } = params;

    const { error } = await client
      .from("order")
      .delete()
      .eq("id", id)
      .select("id")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { success: false, error: "Order not found" },
          { status: 404 }
        );
      }

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

      throw new HttpError(500, error.message);
    }

    return NextResponse.json({
      success: true,
      data: { id, deleted: true },
    });
  } catch (error) {
    const status =
      error instanceof HttpError ? error.status : /* default */ 500;
    const message =
      error instanceof HttpError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Internal server error";

    if (!(error instanceof HttpError)) {
      console.error("Order delete error:", error);
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}

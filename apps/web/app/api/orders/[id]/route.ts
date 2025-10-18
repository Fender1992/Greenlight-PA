/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Single Order | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@greenlight/db/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { HttpError, getScopedClient, requireUser } from "../../_lib/org";
import { validateOrderUpdate } from "@web/lib/validation";

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
    const parsed = validateOrderUpdate(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error, issues: parsed.issues },
        { status: 400 }
      );
    }

    const updates: OrderUpdate = {
      ...(parsed.data.modality
        ? { modality: parsed.data.modality }
        : undefined),
      ...(parsed.data.cpt_codes
        ? { cpt_codes: parsed.data.cpt_codes }
        : undefined),
      ...(parsed.data.icd10_codes
        ? { icd10_codes: parsed.data.icd10_codes }
        : undefined),
      ...(parsed.data.clinic_notes_text !== undefined
        ? { clinic_notes_text: parsed.data.clinic_notes_text ?? null }
        : undefined),
    };

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

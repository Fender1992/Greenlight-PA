/**
 * ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
 * API Route: Orders | Status: [Check STATUS.md] | Modified: 2025-10-17
 */

import { NextRequest, NextResponse } from "next/server";
import { getOrdersByOrg, createOrder } from "@greenlight/db";
import type { Database } from "@greenlight/db/types/database";
import { HttpError, requireUser, resolveOrgId } from "../_lib/org";

type OrderInsert = Database["public"]["Tables"]["order"]["Insert"];

/**
 * GET /api/orders?org_id=xxx
 * List orders for an organization
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    await requireUser();
    const orgId = await resolveOrgId(searchParams.get("org_id"));

    const result = await getOrdersByOrg(orgId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Order list error:", error);
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
 * POST /api/orders
 * Create new order
 *
 * Body:
 * {
 *   org_id: string,
 *   patient_id: string,
 *   provider_id: string,
 *   modality: string,
 *   cpt_codes: string[],
 *   icd10_codes: string[],
 *   clinic_notes_text?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    await requireUser();

    const body = await request.json();
    const {
      org_id,
      patient_id,
      provider_id,
      modality,
      cpt_codes,
      icd10_codes,
      clinic_notes_text,
    } = body;

    const orgId = await resolveOrgId(org_id);

    if (
      !patient_id ||
      !provider_id ||
      !modality ||
      !cpt_codes ||
      !icd10_codes
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: org_id, patient_id, provider_id, modality, cpt_codes, icd10_codes",
        },
        { status: 400 }
      );
    }

    // Validate arrays
    if (!Array.isArray(cpt_codes) || !Array.isArray(icd10_codes)) {
      return NextResponse.json(
        { success: false, error: "cpt_codes and icd10_codes must be arrays" },
        { status: 400 }
      );
    }

    const order: OrderInsert = {
      org_id: orgId,
      patient_id,
      provider_id,
      modality,
      cpt_codes,
      icd10_codes,
      clinic_notes_text: clinic_notes_text || null,
    };

    const result = await createOrder(order);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error.includes("access") ? 403 : 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: result.data },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }

    console.error("Order creation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
